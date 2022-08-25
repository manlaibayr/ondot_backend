import {repository} from '@loopback/repository';
import {UserRepository, VerifyCodeRepository} from '../repositories';
import {param, get, HttpErrors} from '@loopback/rest';
import axios from 'axios';
import moment from 'moment';
import {v4 as uuidv4} from 'uuid';
import {secured, SecuredType} from '../role-authentication';
import {CONFIG} from '../config';
import {SignupType} from '../types';

const crypto = require('crypto');
const CryptoJs = require('crypto-js');

const hashKey = 'KeiJ5KIDjUT7DJEU';
const hashIv = 'fduejUJjr675JUdf';

export class VerifyCodeController {
  constructor(
    @repository(VerifyCodeRepository) public verifyCodeRepository: VerifyCodeRepository,
    @repository(UserRepository) public userRepository: UserRepository,
  ) {
  }

  @get('/verify-codes/send')
  @secured(SecuredType.PERMIT_ALL)
  async sendVerifyCode(
    @param.query.string('email') email: string,
    @param.query.string('number') phoneNumber: string,
  ) {
    // check user exist
    const userInfo = await this.userRepository.findOne({where: {email}});
    if (!userInfo) throw new HttpErrors.BadRequest('입력하신 정보와 일치하는 회원이 없습니다.');
    if(userInfo.signupType === SignupType.NAVER) {
      throw new HttpErrors.BadRequest('네이버계정으로 로그인한 회원입니다.');
    } else if(userInfo.signupType === SignupType.KAKAO) {
      throw new HttpErrors.BadRequest('카카오계정으로 로그인한 회원입니다.');
    } else if(userInfo.signupType === SignupType.GOOGLE) {
      throw new HttpErrors.BadRequest('구글계정으로 로그인한 회원입니다.');
    } else if(userInfo.signupType === SignupType.EMAIL) {
      if(userInfo.phoneNumber !== phoneNumber) throw new HttpErrors.BadRequest('휴대폰번호가 정확하지 않습니다.');
      const verifyCodeString = Math.floor(100000 + Math.random() * 900000).toString();
      const formUrlEncoded = (x: any) => Object.keys(x).reduce((p, c) => p + `&${c}=${encodeURIComponent(x[c])}`, '');

      const smsResult = await axios.post(
        'https://apis.aligo.in/send/',
        formUrlEncoded({
          key: 'nzqdlpr9gfkio7a32uih1e67sl8nxxop', user_id: 'ontec', sender: '01055556408', receiver: phoneNumber,
          msg_type: 'SMS', title: '온닷', msg: `[온닷] 인증번호 [${verifyCodeString}]를 입력해 주세요.`, testmode_yn: 'N',
        }),
        {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        },
      );
      console.log(verifyCodeString);
      if (smsResult.data.result_code === '1') {
        const codeInfo = await this.verifyCodeRepository.create({verifyPhoneNumber: phoneNumber, verifyCodeString, expiredDate: moment().add(10, 'minutes')});
        return {codeId: codeInfo.id};
      } else {
        throw new HttpErrors.BadRequest('인증메시지를 전송하지 못했습니다.');
      }
    } else {
      throw new HttpErrors.BadRequest('비밀번호를 재설정할수 없습니다.');
    }
  }

  @get('/verify-codes/confirm')
  @secured(SecuredType.PERMIT_ALL)
  async confirmVerifyCode(
    @param.query.string('codeId') codeId: string,
    @param.query.string('code') code: string,
  ) {
    const codeInfo = await this.verifyCodeRepository.findById(codeId);
    if (codeInfo.verifyCodeString !== code) {
      throw new HttpErrors.BadRequest('인증번호가 정확하지 않습니다.');
    } else if (codeInfo.expiredDate < new Date()) {
      throw new HttpErrors.BadRequest('시간이 만료되었습니다.');
    }
    return {
      result: 'success',
    };
  }

  static getNicePhoneNumber(tokenVersionId: string, encData: string, integrityValue: string, token: string) {
    const hashedVal = CryptoJs.AES.decrypt(token, CryptoJs.enc.Utf8.parse(hashKey), {iv: CryptoJs.enc.Utf8.parse(hashIv)}).toString(CryptoJs.enc.Utf8);
    const key = CryptoJs.enc.Utf8.parse(hashedVal.substring(0, 16));
    const iv = CryptoJs.enc.Utf8.parse(hashedVal.substring(hashedVal.length - 16, hashedVal.length + 1));
    const hmac_key = CryptoJs.enc.Utf8.parse(hashedVal.substring(0, 32));
    if(CryptoJs.enc.Base64.stringify(CryptoJs.HmacSHA256(encData, hmac_key)) !== integrityValue) {
      throw new HttpErrors.BadRequest('본인인증정보가 정확하지 않습니다.');
    }
    const respData = JSON.parse(CryptoJs.AES.decrypt(encData, key, {iv: iv}).toString(CryptoJs.enc.Latin1));
    if(!respData.mobileno) {
      throw new HttpErrors.BadRequest('본인인증정보가 정확하지 않습니다.');
    }
    return {
      realUserId: respData.di,
      name: decodeURI(respData.utf8_name),
      sex: respData.gender === '1',
      birthday: respData.birthdate,
      isForeign: respData.nationalinfo === '1',
      phoneNumber: respData.mobileno,
    }
  }

  @get('/verify-codes/nice-link')
  @secured(SecuredType.PERMIT_ALL)
  async getNiceAuthLink() {
    const reqData = {
      'dataHeader': {'CNTY_CD': 'ko'},
      'dataBody': {
        req_dtim: moment().format('YYYYMMDDHHmmss'),
        req_no: uuidv4().replace(/-/g, '').substring(0, 20),
        enc_mode: '1',
      },
    };
    const encodingTokenInfo = await axios.post(
      'https://svc.niceapi.co.kr:22001/digital/niceid/api/v1.0/common/crypto/token',
      reqData,
      {
        headers: {
          'Host': 'svc.niceapi.co.kr:22001',
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + Buffer.from(`${CONFIG.nice.organizationToken}:${moment().unix()}:${CONFIG.nice.clientId}`).toString('base64'),
          'client_id': CONFIG.nice.clientId,
          'productID': CONFIG.nice.productID,
        },
      },
    );
    if (encodingTokenInfo.data.dataHeader.GW_RSLT_CD !== '1200') throw new HttpErrors.HttpError('본인인증 서비스를 이용할수 없습니다.');
    const tokenVal = encodingTokenInfo.data.dataBody.token_val;
    const hashedVal = crypto.createHash('sha256').update(reqData.dataBody.req_dtim + reqData.dataBody.req_no + tokenVal).digest('base64');
    const key = CryptoJs.enc.Utf8.parse(hashedVal.substring(0, 16));
    const iv = CryptoJs.enc.Utf8.parse(hashedVal.substring(hashedVal.length - 16, hashedVal.length + 1));
    const hmac_key = CryptoJs.enc.Utf8.parse(hashedVal.substring(0, 32));
    const requestData = {
      'requestno': uuidv4().substring(0, 30),
      'returnurl': 'https://ontec.co.kr/nice-result',
      'sitecode': encodingTokenInfo.data.dataBody.site_code,
      'authtype': 'M',
      'methodtype': 'get',
      'popupyn': 'N',
      'receivedata': uuidv4(),
    };
    const enc_data = CryptoJs.AES.encrypt(JSON.stringify(requestData), key, {iv: iv}).toString();
    const integrity_value = CryptoJs.enc.Base64.stringify(CryptoJs.HmacSHA256(enc_data, hmac_key));
    const niceAuthLink = `https://nice.checkplus.co.kr/CheckPlusSafeModel/service.cb` +
      `?m=service&token_version_id=${encodingTokenInfo.data.dataBody.token_version_id}&enc_data=${encodeURIComponent(enc_data)}&integrity_value=${encodeURIComponent(integrity_value)}`;
    return {
      url: niceAuthLink,
      token: CryptoJs.AES.encrypt(hashedVal, CryptoJs.enc.Utf8.parse(hashKey), {iv: CryptoJs.enc.Utf8.parse(hashIv)}).toString()
    };
  }

}

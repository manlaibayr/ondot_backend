import {get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody, response, Response, RestBindings} from '@loopback/rest';
import {Count, Filter, repository} from '@loopback/repository';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {promisify} from 'util';
import uid from 'uid2';
import axios from 'axios';
import {OAuth2Client} from 'google-auth-library';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import AppleAuth from 'apple-auth';
import {CONFIG} from '../config';
import {secured, SecuredType} from '../role-authentication';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {FileUploadHandler, SignupType, UserCredentials, UserStatusType, UserType} from '../types';
import {HobbyProfileRepository, LearningProfileRepository, MeetingProfileRepository, RolemappingRepository, UserRepository, VerifyCodeRepository, VerifytokenRepository} from '../repositories';
import {User, UserRelations, UserWithRelations} from '../models';
import {VerifyCodeController} from './verify-code.controller';

const {sign} = require('jsonwebtoken');
const signAsync = promisify(sign);
const bcrypt = require('bcrypt');
const randomstring = require('randomstring');

export class UserController {
  constructor(
    @inject(RestBindings.Http.RESPONSE) private responseObj: Response,
    @repository(UserRepository) private userRepository: UserRepository,
    @repository(RolemappingRepository) private rolemappingRepository: RolemappingRepository,
    @repository(VerifytokenRepository) private verifytokenRepository: VerifytokenRepository,
    @repository(VerifyCodeRepository) private verifyCodeRepository: VerifyCodeRepository,
    @repository(MeetingProfileRepository) private profileMeetingRepository: MeetingProfileRepository,
    @repository(HobbyProfileRepository) private hobbyProfileRepository: HobbyProfileRepository,
    @repository(LearningProfileRepository) private learningProfileRepository: LearningProfileRepository,
    @inject(FILE_UPLOAD_SERVICE) private fileUploadHandler: FileUploadHandler,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }


  checkPassword(encrypt: string, plain: string): boolean {
    if (encrypt && plain) {
      return bcrypt.compareSync(plain, encrypt);
    } else {
      return false;
    }
  }

  generatePassword(plain: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(plain, salt);
  }

  async thirdUserInfo(type: string, data: any) {
    if (type === SignupType.NAVER) {
      const naverResp = await axios.get('https://openapi.naver.com/v1/nid/me', {headers: {'Authorization': 'Bearer ' + data.accessToken}});
      if (naverResp.data.resultcode !== '00') {
        throw new HttpErrors.InternalServerError(naverResp.data.message);
      }
      const naverUserInfo = naverResp.data.response;
      return {
        signupType: SignupType.NAVER,
        email: naverUserInfo.email,
        name: naverUserInfo.name,
        nickname: naverUserInfo.nickname,
        gender: naverUserInfo.gender,
        birthday: naverUserInfo.birthday,
        age: naverUserInfo.birthday ? moment().diff(moment(naverUserInfo.birthday, 'YYYYMMDD'), 'years') : 0,
      };
    } else if (type === SignupType.KAKAO) {
      const kakaoResp = await axios.get('https://kapi.kakao.com/v2/user/me', {headers: {'Authorization': 'Bearer ' + data.accessToken}});
      const kakaoUserInfo = kakaoResp.data.kakao_account;
      return {
        signupType: SignupType.KAKAO,
        email: kakaoUserInfo.email,
        name: kakaoUserInfo.name,
        nickname: kakaoUserInfo.profile?.nickname,
      };
    } else if (type === SignupType.GOOGLE) {
      const googleAuthClient = new OAuth2Client(CONFIG.GOOGLE_CLIENT_ID);
      const ticket = await googleAuthClient.verifyIdToken({idToken: data.idToken, audience: CONFIG.GOOGLE_CLIENT_ID});
      const payload = ticket.getPayload();
      if (payload) {
        return {
          signupType: SignupType.GOOGLE,
          email: payload.email,
          name: payload.name,
        };
      } else {
        throw new HttpErrors.BadRequest('Google 토큰이 정확하지 않습니다.');
      }
    } else if (type === SignupType.APPLE) {
      const config = {
        ...CONFIG.appleSignupConfig,
        client_id: data.device === 'WEB' ? CONFIG.appleClientIfForWeb : CONFIG.appleClientIdForApp,
      };
      const appleAuth = new AppleAuth(
        config,
        CONFIG.appleAuthKey,
        'text',
      );
      const appleResp = await appleAuth.accessToken(data.authorizationCode);
      const appleData: any = jwt.decode(appleResp.id_token);
      return {
        signupType: SignupType.APPLE,
        email: appleData.email,
        name: appleData.name,
      };
    } else {
      throw new HttpErrors.BadRequest('파라미터가 정확하지 않습니다.');
    }
  }

  @post('/users')
  async signup(
    @requestBody() signUpInfo: {
      email?: string, password?: string, type?: SignupType, data?: any, phoneNumber?: string, refereeEmail?: string,
      niceAuthResp: {tokenVersionId: string, encData: string, integrityValue: string, token: string}
    },
  ) {
    let userData: any;
    if (signUpInfo.type && signUpInfo.data) {
      userData = await this.thirdUserInfo(signUpInfo.type, signUpInfo.data);
      userData.password = 'NOPASS';
    } else if (signUpInfo.email && signUpInfo.password) {
      userData = {email: signUpInfo.email, password: signUpInfo.password, signupType: SignupType.EMAIL};
    } else {
      throw new HttpErrors.BadRequest('유효하지 않은 요청입니다.');
    }

    const findResult = await this.userRepository.findOne({where: {email: userData.email}});
    if (findResult) {
      throw new HttpErrors.UnprocessableEntity('이미 존재하는 아이디(이메일)입니다.');
    }
    const niceInfo = VerifyCodeController.getNicePhoneNumber(
      signUpInfo.niceAuthResp.tokenVersionId, signUpInfo.niceAuthResp.encData, signUpInfo.niceAuthResp.integrityValue, signUpInfo.niceAuthResp.token);
    const checkRealUserInfo = await this.userRepository.findOne({where: {realUserId: niceInfo.realUserId}});
    if (checkRealUserInfo) {
      if(checkRealUserInfo.userStatus === UserStatusType.LEAVE) {
        throw new HttpErrors.BadRequest('이미 삭제된 계정입니다. 다시 가입하시려면 관리자에게 문의하세요.');
      } else if (checkRealUserInfo.signupType === signUpInfo.type) {
        throw new HttpErrors.BadRequest(niceInfo.name + `님은 이미 ${checkRealUserInfo.email}으로 이미 가입이 되있으십니다.`);
      } else {
        return {result: 'existEmail', data: {userId: checkRealUserInfo.id, email: checkRealUserInfo.email, signupType: checkRealUserInfo.signupType}};
      }
    }
    signUpInfo.phoneNumber = niceInfo.phoneNumber;
    const userInfo = await this.userRepository.create({
      username: niceInfo.name,
      password: this.generatePassword(userData.password),
      email: userData.email,
      realUserId: niceInfo.realUserId,
      sex: niceInfo.sex,
      birthday: niceInfo.birthday,
      age: niceInfo.birthday ? moment().diff(moment(niceInfo.birthday, 'YYYYMMDD'), 'years') : 0,
      isForeign: niceInfo.isForeign,
      signupType: userData.signupType,
      phoneNumber: signUpInfo.phoneNumber,
      refereeEmail: signUpInfo.refereeEmail,
      userType: UserType.USER,
      userStatus: UserStatusType.NORMAL,
    });
    await this.rolemappingRepository.create({user_id: userInfo.id, role_id: UserType.USER});
    return {
      result: 'success',
    };
  }

  @post('/users/login')
  async login(@requestBody() loginInfo: {username?: string; password?: string, login_type?: string, thirdTokenData?: {type: SignupType, data: any}}) {
    const TOKEN_LENGTH = 64;
    const JWT_EXPIRES = 3; // days
    let user: (User & UserRelations) | null;
    if (loginInfo.username && loginInfo.password) {
      if (!loginInfo.username || !loginInfo.password) throw new HttpErrors.BadRequest('아이디나 암호가 정확하지 않습니다.');
      user = await this.userRepository.findOne({where: {or: [{username: loginInfo.username}, {email: loginInfo.username}], signupType: SignupType.EMAIL, userStatus: UserStatusType.NORMAL}});
      if (!user) throw new HttpErrors.Unauthorized('Invalid credentials');
      const isPasswordMatched = this.checkPassword(user.password, loginInfo.password);
      if (!isPasswordMatched) throw new HttpErrors.Unauthorized('아이디나 암호가 정확하지 않습니다.');
      if (loginInfo.login_type && loginInfo.login_type === 'admin') {
        const roleInfo = await this.rolemappingRepository.findOne({where: {user_id: user.id, role_id: UserType.ADMIN}});
        if (!roleInfo) throw new HttpErrors.Unauthorized('아이디나 암호가 정확하지 않습니다.');
      }
    } else if (loginInfo.thirdTokenData) {
      const thirdUserInfo = await this.thirdUserInfo(loginInfo.thirdTokenData.type, loginInfo.thirdTokenData.data);
      user = await this.userRepository.findOne({where: {email: thirdUserInfo.email, signupType: thirdUserInfo.signupType, userStatus: UserStatusType.NORMAL}});
      if (!user) throw new HttpErrors.Unauthorized('Invalid credentials');
    } else {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }

    const verifyToken = uid(TOKEN_LENGTH);
    const date = new Date();
    await this.verifytokenRepository.create({id: verifyToken, user_id: user.id, token_valid: true, expire: date.setDate(date.getDate() + JWT_EXPIRES)});
    const tokenObject = {userId: user.id, username: user.username, userType: user.userType, verifyToken: verifyToken};
    const token = await signAsync(tokenObject, CONFIG.jwtSecretKey, {expiresIn: JWT_EXPIRES + 'd'});
    // const roles = await this.rolemappingRepository.find({where: {user_id: user.id}});
    // const {id, username} = user;
    this.responseObj.setHeader('Set-Cookie', 'token=' + token);
    return {
      token,
      info: {
        id: user.id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        signupType: user.signupType,
      },
    };
  }

  @post('/users/check-third-user')
  @secured(SecuredType.PERMIT_ALL)
  async checkThirdUserExist(
    @requestBody() info: {type: SignupType; data: any},
  ) {
    const userInfo = await this.thirdUserInfo(info.type, info.data);
    const findInfo = await this.userRepository.findOne({where: {email: userInfo.email}});
    if (findInfo) {
      // 이미 로그인된 계정, 로그인으로 이동
      if (findInfo.signupType === userInfo.signupType) {
        return {result: 'login'};
      } else {
        return {result: 'existEmail', data: {userId: findInfo.id, email: userInfo.email, signupType: findInfo.signupType}};
      }
    } else {
      // 새로 추가되어야 하는 계정
      return {result: 'signup'};
    }
  }

  @get('/users/logout')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(204, {
    description: 'User logout',
  })
  async logout() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    await this.verifytokenRepository.updateById(currentUser.verifyToken, {token_valid: false});
    await this.userRepository.updateById(currentUser.userId, {pushToken: ''});
  }

  @get('/users/info')
  @secured(SecuredType.IS_AUTHENTICATED)
  async getUserInfo() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const userInfo = await this.userRepository.findById(currentUser.userId);
    const profileMeeting = await this.profileMeetingRepository.findOne({where: {userId: currentUser.userId}});
    const profileHobby = await this.hobbyProfileRepository.findOne({where: {userId: currentUser.userId}});
    const profileLearning = await this.learningProfileRepository.findOne({where: {userId: currentUser.userId}});
    return {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      age: userInfo.age,
      phoneNumber: userInfo.phoneNumber,
      freeFlower: userInfo.freeFlower,
      payFlower: userInfo.payFlower,
      profile: {
        meeting: profileMeeting,
        hobby: profileHobby,
        learning: profileLearning,
      },
      availableLearning: true,
      availableGift: false,
      availableCharge: true,
    };
  }

  @post('/users/info')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(204, {
    description: 'update user info',
  })
  async setUserInfo(
    @requestBody() data: {name?: string},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    await this.userRepository.updateById(currentUser.userId, {username: data.name});
  }


  @post('/users/password')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(204, {
    description: 'update user info',
  })
  async changeUserPassword(
    @requestBody() data: {oldPassword: string; newPassword: string},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const userInfo: User = await this.userRepository.findById(currentUser.userId);
    if (!this.checkPassword(userInfo.password, data.oldPassword)) {
      return {result: 'failed', msg: '이전암호가 정확하지 않습니다.'};
    } else {
      await this.userRepository.updateById(currentUser.userId, {password: this.generatePassword(data.newPassword)});
      return {result: '성공'};
    }
  }

  @get('/users/push-set')
  @secured(SecuredType.IS_AUTHENTICATED)
  async userPushSet(
    @param.query.boolean('isAllow') isAllow: boolean,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return this.userRepository.updateById(currentUser.userId, {isPushAllow: isAllow});
  }

  @post('/users/reset-password')
  async resetPassword(
    @requestBody() data: {email: string, password: string, tokenVersionId: string, encData: string, integrityValue: string, token: string},
  ) {
    // const verifyCodeInfo = await this.verifyCodeRepository.findOne({where: {id: data.codeId, verifyCodeString: data.code, verifyPhoneNumber: data.phoneNumber}});
    // if (!verifyCodeInfo) throw new HttpErrors.InternalServerError('잘못된 요청입니다.');
    // await this.verifyCodeRepository.deleteById(data.codeId);
    const niceInfo = VerifyCodeController.getNicePhoneNumber(data.tokenVersionId, data.encData, data.integrityValue, data.token);
    const userInfo = await this.userRepository.findOne({where: {email: data.email, realUserId: niceInfo.realUserId}});
    if (!userInfo) throw new HttpErrors.InternalServerError('잘못된 요청입니다.');
    return this.userRepository.updateById(userInfo.id, {password: this.generatePassword(data.password)});
  }

  @post('/users/pushToken')
  @secured(SecuredType.PERMIT_ALL)
  async setPushToken(
    @requestBody() data: {pushToken: string},
  ) {
    let currentUser: UserCredentials | undefined;
    try {
      currentUser = await this.getCurrentUser() as UserCredentials;
      await this.userRepository.updateById(currentUser.userId, {pushToken: data.pushToken});
      // eslint-disable-next-line no-empty
    } catch (e) {
    }
  }

  @post('/users/duplicate-email')
  @secured(SecuredType.PERMIT_ALL)
  async checkDuplicateEmail(
    @requestBody() data: {email: string},
  ) {
    const {count} = await this.userRepository.count({email: data.email});
    return {emailExist: count !== 0};
  }

  @post('/users/change-signup-type')
  @secured(SecuredType.PERMIT_ALL)
  async changeSignupType(
    @requestBody() data: {userId: string, thirdTokenData: any},
  ) {
    const thirdUserInfo = await this.thirdUserInfo(data.thirdTokenData.type, data.thirdTokenData.data);
    const userInfo = await this.userRepository.findById(data.userId);
    if (userInfo.email === thirdUserInfo.email && userInfo.signupType !== thirdUserInfo.signupType) {
      await this.userRepository.updateById(data.userId, {signupType: thirdUserInfo.signupType});
    }
  }

  @get('/users/remove')
  @secured(SecuredType.IS_AUTHENTICATED)
  async userRemove() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    await this.userRepository.updateById(currentUser.userId, {userStatus: UserStatusType.LEAVE});
  }


  //*========== admin functions ==========*//
  @get('/users')
  @secured(SecuredType.HAS_ROLES, ['ADMIN'])
  @response(200, {
    description: 'Array of User model instances',
  })
  async userList(
    @param.query.number('page') page: number,
    @param.query.number('count') pageCount: number,
    @param.query.object('search') searchParam?: {text?: string, signupType?: SignupType, userStatus?: UserStatusType},
    @param.query.object('sort') sortParam?: {field: string, asc: boolean},
  ) {
    if (page < 1) throw new HttpErrors.BadRequest('param is not correct');
    const filter: Filter<User> = {};

    filter.where = {and: []};
    if (searchParam?.signupType) filter.where.and.push({signupType: searchParam.signupType});
    if (searchParam?.userStatus) filter.where.and.push({userStatus: searchParam.userStatus});
    if (searchParam?.text) {
      filter.where.and.push({
        or: [{username: {like: `%${searchParam.text}%`}}, {email: {like: `%${searchParam.text}%`}}],
      });
    }
    if (filter.where.and.length === 0) {
      filter.where = {};
    }

    const totalCount: Count = await this.userRepository.count(filter.where);
    filter.skip = (page - 1) * pageCount;
    filter.limit = pageCount;
    if (sortParam?.field) {
      filter.order = [sortParam.field + ' ' + (sortParam.asc ? 'asc' : 'desc')];
    }
    filter.fields = {password: false};
    const data: UserWithRelations[] = await this.userRepository.find(filter);
    return {
      meta: {
        currentPage: page,
        itemsPerPage: pageCount,
        totalItemCount: totalCount.count,
        totalPageCount: Math.ceil(totalCount.count / pageCount),
      },
      data,
    };
  }

  @post('/users/change-password')
  @secured(SecuredType.HAS_ROLES, ['ADMIN'])
  @response(204, {
    description: 'Change user password',
  })
  async changePassword(
    @requestBody() data: {userId: string; password: string},
  ) {
    await this.userRepository.updateById(data.userId, {password: this.generatePassword(data.password)});
  }

  @get('/users/{id}')
  @secured(SecuredType.HAS_ROLES, ['ADMIN'])
  async findById(
    @param.path.string('id') id: string,
  ): Promise<User> {
    return this.userRepository.findById(id);
  }

  @patch('/users/{id}')
  @secured(SecuredType.HAS_ROLES, ['ADMIN'])
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {partial: true}),
        },
      },
    })
      user: User,
  ): Promise<void> {
    const userInfo = await this.userRepository.findById(id);
    if (!user.userType && userInfo.userType !== user.userType) {
      await this.rolemappingRepository.deleteAll({user_id: id});
      await this.rolemappingRepository.create({
        user_id: id,
        role_id: user.userType,
      });
    }
    if (user.password) {
      user.password = this.generatePassword(user.password);
    }
    await this.userRepository.updateById(id, user);
  }
}

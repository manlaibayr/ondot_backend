import {Filter, FilterExcludingWhere, repository} from '@loopback/repository';
import {post, param, get, getModelSchemaRef, requestBody, response, HttpErrors} from '@loopback/rest';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import axios from 'axios';
import {ChargeHistory} from '../models';
import {ChargeHistoryRepository, FlowerHistoryRepository, NotificationRepository, UserRepository} from '../repositories';
import {UserCredentials} from '../types';
import {secured, SecuredType} from '../role-authentication';
import {CONFIG} from '../config';

export class ChargeHistoryController {
  constructor(
    @repository(ChargeHistoryRepository) public chargeHistoryRepository: ChargeHistoryRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @post('/charge-histories')
  @secured(SecuredType.IS_AUTHENTICATED)
  async create(
    @requestBody() data: {imp_uid: string, merchant_uid: string, amount: number, flower: number, desc: string},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    // 액세스 토큰(access token) 발급 받기
    const getToken = await axios({
      url: 'https://api.iamport.kr/users/getToken',
      method: 'post', // POST method
      headers: {'Content-Type': 'application/json'}, // "Content-Type": "application/json"
      data: {
        imp_key: CONFIG.iamportInfo.apiKey, // REST API 키
        imp_secret: CONFIG.iamportInfo.secretKey, // REST API Secret
      },
    });
    const {access_token} = getToken.data.response; // 인증 토큰
    // imp_uid로 아임포트 서버에서 결제 정보 조회
    const getPaymentData = await axios({
      url: `https://api.iamport.kr/payments/${data.imp_uid}`, // imp_uid 전달
      method: 'get', // GET method
      headers: {'Authorization': access_token}, // 인증 토큰 Authorization header에 추가
    });
    const paymentData = getPaymentData.data.response; // 조회한 결제 정보
    // DB에서 결제되어야 하는 금액 조회
    // 결제 검증하기
    if (Number(data.amount) === paymentData.amount && data.merchant_uid === paymentData.merchant_uid) {
      switch (paymentData.status) {
        case 'paid':
          await Promise.all([
            this.userRepository.updateById(currentUser.userId, {userFlower: currentUser.userFlower + Number(data.flower)}),
            this.flowerHistoryRepository.create({
              flowerUserId: currentUser.userId,
              flowerContent: `${data.flower} 충전`,
              flowerValue: data.flower,
            }),
            this.chargeHistoryRepository.create({
              chargeUserId: currentUser.userId,
              impUid: data.imp_uid,
              merchantUid: data.merchant_uid,
              chargeAmount: data.amount,
              chargeFlower: data.flower,
              chargeDesc: paymentData.name,
            }),
          ])
          break;
        default:
          throw new HttpErrors.BadRequest('정확하지 않은 결제요청');
      }
    } else {
      throw new HttpErrors.BadRequest('정확하지 않은 결제요청');
    }
  }

  @get('/charge-histories')
  @response(200, {
    description: 'Array of ChargeHistory model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(ChargeHistory, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(ChargeHistory) filter?: Filter<ChargeHistory>,
  ): Promise<ChargeHistory[]> {
    return this.chargeHistoryRepository.find(filter);
  }

  @get('/charge-histories/{id}')
  @response(200, {
    description: 'ChargeHistory model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(ChargeHistory, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(ChargeHistory, {exclude: 'where'}) filter?: FilterExcludingWhere<ChargeHistory>,
  ): Promise<ChargeHistory> {
    return this.chargeHistoryRepository.findById(id, filter);
  }
}

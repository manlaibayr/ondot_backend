import {get, HttpErrors, param} from '@loopback/rest';
import {Filter, repository} from '@loopback/repository';
import axios from 'axios';
import iconv from 'iconv-lite';
import {v4 as uuidv4} from 'uuid';
import {Utils} from '../utils';
import {CONFIG} from '../config';
import {FlowerHistoryRepository, GiftGoodsRepository, GiftHistoryRepository, MeetingProfileRepository, NotificationRepository, UserRepository} from '../repositories';
import {GiftGoods} from '../models';
import {secured, SecuredType} from '../role-authentication';
import {MainSocketMsgType, NotificationType, ServiceType, UserCredentials} from '../types';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Server} from 'socket.io';

export class GiftGoodsController {
  constructor(
    @repository(GiftGoodsRepository) public giftGoodsRepository: GiftGoodsRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(GiftHistoryRepository) public giftHistoryRepository: GiftHistoryRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  private async validGiftingToken() {
    if (!global.giftingToken) return false;
    const codeResp = await axios.post(CONFIG.gifting.authUrl + '/auth/token/check', {
      custId: Utils.rsaEnc(CONFIG.gifting.custId),
      tokenId: global.giftingToken,
    });
    return (codeResp.data && codeResp.data.status === 'A');
  }

  private async getGiftingToken() {
    const isValidToken = await this.validGiftingToken();
    if (!isValidToken) {
      const codeResp = await axios.post(CONFIG.gifting.authUrl + '/auth/code/issue', {
        custId: Utils.aes256Enc(CONFIG.gifting.custId),
        pwd: Utils.aes256Enc(CONFIG.gifting.pwd),
        autKey: Utils.aes256Enc(CONFIG.gifting.authKey),
        aesKey: Utils.rsaEnc(CONFIG.gifting.aesKey),
        aesIv: Utils.rsaEnc(CONFIG.gifting.aesIv),
      });
      const tokenResp = await axios.post(CONFIG.gifting.authUrl + '/auth/token/issue', {
        codeId: codeResp.data.codeId,
      });
      global.giftingToken = tokenResp.data.tokenId;
    }
    return global.giftingToken;
  }

  @get('/gift-goods/get-list-from-gifting')
  public async getListFromGifting() {
    try {
      // const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbklkIjoibXl1NEZlQmVuUEdnMy9DZGJqOWF3eTJ5UWFIZWtoVVA3emVhcVdsRS9pM0RvSzJLdm5zbVVkdHBOUVNac3BtcEE2VDVpUU9XK3ZXLytXeGEyTC9XL0NLdGNRZWQ0bE9OdkdzdDc3TjRYQXc9Iiwic2lnbmF0dXJlIjoiSERubHE0MXgyQUVKTS9oVXFwTEpIUT09In0.ontUStgyQ_85d4JOhWhyxb7zEzAGnhWwhFWuloBbfVc';
      const token = await this.getGiftingToken();
      const params = new URLSearchParams({
        mdcode: CONFIG.gifting.mdCode,
        response_type: 'JSON',
        token: token,
      });
      const goodsListRawResp = await axios.post(CONFIG.gifting.mediaUrl + '/salelist.do', params,
        {responseType: 'arraybuffer', responseEncoding: 'binary'},
      );
      const goodsListData = JSON.parse(iconv.decode(goodsListRawResp.data, 'euc-kr'));
      const list: GiftGoods[] = goodsListData.goods_list.map((v: any) => ({
        goods_id: v.goods_id,
        category1: v.category1,
        category2: v.category2,
        affiliate: v.affiliate,
        affiliate_category: v.affiliate_category,
        head_swap_cd: v.head_swap_cd,
        swap_cd: v.swap_cd,
        desc: v.desc,
        goods_nm: v.goods_nm,
        goods_img: v.goods_img,
        normal_sale_price: v.normal_sale_price,
        normal_sale_vat: v.normal_sale_vat,
        sale_price: v.sale_price,
        sale_vat: v.sale_vat,
        total_price: v.total_price,
        period_end: v.period_end,
        limit_date: v.limit_date,
        end_date: v.end_date,
        delivery_url: v.delivery_url,
      }));
      await this.giftGoodsRepository.deleteAll({});
      await this.giftGoodsRepository.createAll(list);
    } catch (e) {
      console.error(e);
    }
  }

  @get('/gift-goods')
  @secured(SecuredType.IS_AUTHENTICATED)
  async find(
    @param.query.number('page') page: number,
  ) {
    const filter: Filter<GiftGoods> = {};
    filter.skip = (page - 1) * CONFIG.pageLimit;
    filter.limit = 50;
    const list = await this.giftGoodsRepository.find(filter);
    return list.map((v) => ({
      goods_id: v.goods_id,
      goods_nm: v.goods_nm,
      goods_img: v.goods_img,
      affiliate_category: v.affiliate_category,
      desc: v.desc,
      goods_flower: v.total_price ? (v.total_price / 10) : 0,
    }));
  }

  @get('/gift-goods/send')
  @secured(SecuredType.IS_AUTHENTICATED)
  async sendGifting(
    @param.query.string('goodsId') goodsId: string,
    @param.query.string('otherUserId') otherUserId: string,
    @ws.namespace('main') nspMain: Server,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const [userInfo, userMeetingProfile, otherUserInfo, otherMeetingProfile, giftingInfo] = await Promise.all([
      this.userRepository.findById(currentUser.userId),
      this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}, fields: ['id', 'meetingNickname']}),
      this.userRepository.findById(otherUserId),
      this.meetingProfileRepository.findOne({where: {userId: otherUserId}, fields: ['id', 'meetingNickname']}),
      this.giftGoodsRepository.findById(goodsId),
    ]);

    if (!giftingInfo.total_price) throw new HttpErrors.BadRequest('선물이 정확하지 않습니다.');
    const giftingFlower = giftingInfo.total_price / 10;
    if (giftingFlower > userInfo.userFlower) throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');

    const giftHistoryId = uuidv4();
    const token = await this.getGiftingToken();
    const sendParam = new URLSearchParams({
      mdcode: CONFIG.gifting.mdCode,
      response_type: 'JSON',
      token: token,
      goods_id: goodsId,
      msg: `${userMeetingProfile?.meetingNickname}님이 선물을 보냈습니다.`,
      title: `${userMeetingProfile?.meetingNickname}님이 선물을 보냈습니다.`,
      callback: userInfo.phoneNumber ?? ' ',
      phone_no: otherUserInfo.phoneNumber ?? ' ',
      tr_id: giftHistoryId,
    });
    const giftSendRawResp = await axios.post(CONFIG.gifting.mediaUrl + '/request.do', sendParam,
      {responseType: 'arraybuffer', responseEncoding: 'binary'},
    );
    const giftSendData = JSON.parse(iconv.decode(giftSendRawResp.data, 'euc-kr'));
    if(giftSendData.result_code !== "1000") {
      throw new HttpErrors.BadRequest(giftSendData.result_reason);
    }

    await Promise.all([
      this.userRepository.updateById(currentUser.userId, {userFlower: userInfo.userFlower - giftingFlower}),
      this.flowerHistoryRepository.create(
        {flowerUserId: currentUser.userId, flowerContent: otherMeetingProfile?.meetingNickname + '님에게 선물함', flowerValue: -giftingFlower},
      ),
      this.notificationRepository.create({
        notificationSendUserId: currentUser.userId,
        notificationReceiveUserId: otherUserId,
        notificationMsg: userMeetingProfile?.meetingNickname + `님에게서 선물(${giftingInfo.goods_nm})을 받았습니다.`,
        notificationType: NotificationType.SENT_GIFTING,
        notificationServiceType: ServiceType.MEETING,
        notificationDesc: '',
      }),
      this.giftHistoryRepository.create({
        id: giftHistoryId,
        goodsId: goodsId,
        giftSendUserId: currentUser.userId,
        giftReceiveUserId: otherUserId,
        goodsName: giftingInfo.goods_nm,
        giftPrice: giftingInfo.total_price,
        giftFlower: giftingFlower,
        giftCtrId: giftSendData.ctr_id,
      })
    ]);
    nspMain.to(otherUserId).emit(MainSocketMsgType.SRV_NOTIFICATION, {
      title: '선물을 받았습니다.',
      msg: userMeetingProfile?.meetingNickname + `님에게서 선물(${giftingInfo.goods_nm})을 받았습니다.`,
      icon: userMeetingProfile?.meetingPhotoMain,
    });
    return {userFlower: userInfo.userFlower - giftingFlower};
  }
}

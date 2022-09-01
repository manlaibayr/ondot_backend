import {repository} from '@loopback/repository';
import {get, HttpErrors, param, post, requestBody} from '@loopback/rest';
import {FlowerHistoryRepository, HobbyRoomRepository, MeetingProfileRepository, UsagePassRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {FlowerHistoryType, ServiceType, UserCredentials} from '../types';
import moment from 'moment';
import {Utils} from '../utils';

export class FlowerController {
  constructor(
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(UsagePassRepository) public usagePassRepository: UsagePassRepository,
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  async hasUsagePass(userId: string, serviceType: ServiceType) {
    const count = await this.usagePassRepository.count({passUserId: userId, passExpireDate: {gte: moment().toDate()}});
    return count.count > 0;
  }

  @get('/flowers/histories')
  @secured(SecuredType.IS_AUTHENTICATED)
  async historyList() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const userInfo = await this.userRepository.findById(currentUser.userId);
    const flowerHistory = await this.flowerHistoryRepository.find({where: {flowerUserId: currentUser.userId}, order: ['createdAt asc']});
    const usagePassList = await this.usagePassRepository.find({
      where: {passUserId: currentUser.userId, passExpireDate: {gte: moment().toDate()}},
      order: ['passExpireDate desc'],
    });
    const roomList = await this.hobbyRoomRepository.find({where: {userId: currentUser.userId, isRoomDelete: false}});
    const roomUsagePass = roomList.map((v) => ({
      roomId: v.id,
      roomTitle: v.roomTitle,
      createdAt: v.createdAt,
      expiredDate: v.roomExpiredDate,
      isNeedExtent: moment().add(10, 'days') > moment(v.roomExpiredDate)
    }));

    return {
      freeFlower: userInfo.freeFlower,
      payFlower: userInfo.payFlower,
      flowerHistory: flowerHistory.map((v) => ({id: v.id, content: v.flowerContent, value: v.flowerValue, createdAt: v.createdAt})),
      meetingUsagePass: usagePassList.filter((v) => v.passServiceType === ServiceType.MEETING),
      learningUsagePass: usagePassList.filter((v) => v.passServiceType === ServiceType.LEARNING),
      roomUsagePass,
    };
  }

  @post('/flowers/give')
  @secured(SecuredType.IS_AUTHENTICATED)
  async giveFlower(
    @requestBody() data: {otherUserId: string, flower: number},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const [userMeetingProfile, otherUserInfo, otherMeetingProfile] = await Promise.all([
      this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}, fields: ['id', 'meetingNickname']}),
      this.userRepository.findById(data.otherUserId),
      this.meetingProfileRepository.findOne({where: {userId: data.otherUserId}, fields: ['id', 'meetingNickname']}),
    ]);

    if (data.flower > currentUser.payFlower) throw new HttpErrors.BadRequest('유료플라워가 충분하지 않습니다.');
    await Promise.all([
      this.userRepository.updateById(currentUser.userId, {payFlower: currentUser.payFlower - data.flower}),
      this.userRepository.updateById(data.otherUserId, {payFlower: otherUserInfo.payFlower + data.flower}),
      this.flowerHistoryRepository.createAll([
        {flowerUserId: currentUser.userId, flowerContent: otherMeetingProfile?.meetingNickname + '님에게 선물함', flowerValue: -data.flower, flowerHistoryType: FlowerHistoryType.GIVE_FLOWER},
        {flowerUserId: data.otherUserId, flowerContent: userMeetingProfile?.meetingNickname + '님에게서 선물을 받음', flowerValue: data.flower, flowerHistoryType: FlowerHistoryType.RECEIVE_FLOWER},
      ]),
    ]);
    return {payFlower: currentUser.payFlower - data.flower};
  }

  @get('/flowers/pass-purchase')
  @secured(SecuredType.IS_AUTHENTICATED)
  async usagePassPurchase(
    @param.query.string('passId') passId: string,
    @param.query.string('serviceType') serviceType: ServiceType,
  ) {
    const priceList: any = {
      [ServiceType.MEETING]: {
        month1: {flower: 1000, label: '1개월', dateNum: 1, dateUnit: 'months'},
        month3: {flower: 2000, label: '3개월', dateNum: 3, dateUnit: 'months'},
        month6: {flower: 3000, label: '6개월', dateNum: 6, dateUnit: 'months'},
      },
      [ServiceType.LEARNING]: {
        week1: {flower: 1500, label: '1주일', dateNum: 1, dateUnit: 'weeks'},
        month1: {flower: 3000, label: '1개월', dateNum: 1, dateUnit: 'months'},
        month3: {flower: 6000, label: '3개월', dateNum: 3, dateUnit: 'months'},
        month6: {flower: 9000, label: '6개월', dateNum: 6, dateUnit: 'months'},
      },
    };
    const passReqInfo = priceList[serviceType]?.[passId];
    if (!passReqInfo) throw new HttpErrors.BadRequest('정확하지 않은 요청입니다.');
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    if((currentUser.payFlower + currentUser.freeFlower) < passReqInfo.flower) throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    // 이미 존재하는 이용권 확인
    const alreadyPassList = await this.usagePassRepository.find({
      where: {passUserId: currentUser.userId, passServiceType: serviceType, passExpireDate: {gte: moment().toDate()}},
      order: ['passExpireDate desc'],
    });
    const passStartDate = alreadyPassList.length > 0 ? alreadyPassList[0].passExpireDate : moment().toDate();
    const passExpireDate = moment(passStartDate).add(passReqInfo.dateNum, passReqInfo.dateUnit);
    const updateFlowerInfo = Utils.calcUseFlower(currentUser.freeFlower, currentUser.payFlower, passReqInfo.flower);
    await Promise.all([
      this.userRepository.updateById(currentUser.userId, {freeFlower: updateFlowerInfo.updateFlower.freeFlower, payFlower: updateFlowerInfo.updateFlower.payFlower}),
      this.flowerHistoryRepository.createAll(updateFlowerInfo.history.map((v: any) => ({
        flowerUserId: currentUser.userId,
        flowerContent: `${serviceType} ${passReqInfo.label} 이용권 구매`,
        flowerValue: v.flowerValue,
        isFreeFlower: v.isFreeFlower
      }))),
      this.usagePassRepository.create({
        passUserId: currentUser.userId,
        passName: passReqInfo.label,
        passStartDate,
        passExpireDate,
        passServiceType: serviceType
      }),
    ]);
    return {freeFlower: updateFlowerInfo.updateFlower.freeFlower, payFlower: updateFlowerInfo.updateFlower.payFlower};
  }
}

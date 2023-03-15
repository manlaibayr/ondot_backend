import {Filter, repository} from '@loopback/repository';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {get, HttpErrors, param} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {BlockPhoneRepository, ChatContactRepository, FlowerHistoryRepository, MeetingProfileRepository, NotificationRepository, PointSettingRepository, UserRepository} from '../repositories';
import {ChatType, ContactStatus, FlowerHistoryType, MainSocketMsgType, NotificationType, PointSettingType, ServiceType, UserCredentials} from '../types';
import {Namespace, Server} from 'socket.io';
import {ws} from '../websockets/decorators/websocket.decorator';
import {FlowerController} from './flower.controller';
import {Utils} from '../utils';
import {NotificationController} from './notification.controller';
import {MeetingProfile, User} from '../models';
import {MeetingProfileController} from './meeting-profile.controller';

export class MeetingController {
  constructor(
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @repository(BlockPhoneRepository) public blockPhoneRepository: BlockPhoneRepository,
    @repository(PointSettingRepository) public pointSettingRepository: PointSettingRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(`controllers.FlowerController`) private flowerController: FlowerController,
    @inject(`controllers.NotificationController`) private notificationController: NotificationController,
  ) {
  }

  getMeetingMatchCount(
    myProfile: any,
    otherProfile: any,
  ): number {
    const keys = [
      // {myStartKey: 'meetingOtherStartAge', myEndKey: 'meetingOtherEndAge', otherKey: 'age'},
      // {myKey: 'meetingOtherResidence', otherKey: 'meetingResidence'},
      {myKey: 'meetingOtherMeeting', otherKey: 'meetingMeeting'},
      {myKey: 'meetingOtherBodyType', otherKey: 'meetingBodyType'},
      {myStartKey: 'meetingOtherStartHeight', myEndKey: 'meetingOtherEndHeight', otherKey: 'meetingHeight'},
      // {myKey: 'meetingOtherSex', otherKey: 'sex'},
      {myKey: 'meetingOtherPersonality', otherKey: 'meetingPersonality'},
      {myKey: 'meetingOtherSmoking', otherKey: 'meetingSmoking'},
    ];
    let matchCount = 0;
    keys.forEach((v: any) => {
      if (v.myKey && v.myKey.indexOf('Residence') !== -1) {
        if (otherProfile[v.otherKey].indexOf(myProfile[v.myKey])) matchCount++;
      } else if (v.myKey) {
        if (myProfile[v.myKey] === otherProfile[v.otherKey]) matchCount++;
      } else if (v.myStartKey && v.myEndKey) {
        if (myProfile[v.myStartKey] <= otherProfile[v.otherKey] && myProfile[v.myEndKey] >= otherProfile[v.otherKey]) matchCount++;
      }
    });
    return matchCount;
  }

  getDistance(
    myProfile: any,
    otherProfile: any,
  ): number {
    if (!myProfile.meetingResidenceLat || !myProfile.meetingResidenceLng || !otherProfile.meetingResidenceLat || !otherProfile.meetingResidenceLng) return 999999;
    const toRad = (value: number) => {
      return value * Math.PI / 180;
    };
    const R = 6371; // km
    const dLat = toRad(otherProfile.meetingResidenceLat - myProfile.meetingResidenceLat);
    const dLon = toRad(otherProfile.meetingResidenceLng - myProfile.meetingResidenceLng);
    const lat1 = toRad(myProfile.meetingResidenceLat);
    const lat2 = toRad(otherProfile.meetingResidenceLat);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  @get('/meetings/main')
  @secured(SecuredType.IS_AUTHENTICATED)
  async meetingMain(
    @ws.namespace('main') nspMain: Namespace,
    @param.query.string('listType') listType?: string,
    @param.query.number('page') page?: number,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const userProfile: User = await this.userRepository.findById(currentUser.userId, {fields: ['phoneNumber']});
    const myProfile = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    // 지인차단
    const blockPhones = await this.blockPhoneRepository.find({where: {blockPhoneUserId: currentUser.userId}});
    const blockedPhones = await this.blockPhoneRepository.find({where: {blockPhoneName: {like: '%' + userProfile.phoneNumber}}});
    const blockUsers = await this.userRepository.find({where: {phoneNumber: {inq: blockPhones.map((v) => v.blockPhoneNum)}}});
    const blockIds = blockUsers.map((v) => v.id).concat(blockedPhones.map((v) => v.blockPhoneUserId));
    blockIds.push(currentUser.userId);
    const blockIdsStr = blockIds.length === 0 ? '' : "'" + blockIds.join("','") + "'";
    const rooms: any = nspMain.adapter.rooms;
    const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');
    const countPerPage = 15;
    const startNum = page ? (page - 1) * countPerPage : 0;
    const endNum = page ? page * countPerPage : countPerPage;

    const filter: Filter<MeetingProfile> = {
      skip: startNum,
      limit: countPerPage,
      order: ['meetingRanking desc']
    };
    filter.where = {userId: {nin: blockIds}};

    let popularList, nearList, matchList
    //인기순
    if(listType === 'main' || listType === 'popularList') {
      const popularListResult = await this.meetingProfileRepository.find(filter);
      popularList = popularListResult.map((v: any) => ({
        ...v,
        isOnline: onlineUserIds.indexOf(v.userId) !== -1,
      }));
      if (listType === 'popularList') return popularList;
    }

    // 거리순
    if(listType === 'main' || listType === 'nearList') {
      const query = `SELECT *, (6371*acos(cos(radians(${myProfile?.meetingResidenceLat}))*cos(radians(meetingResidenceLat))*cos(radians(meetingResidenceLng)-radians(${myProfile?.meetingResidenceLng}))+sin(radians(${myProfile?.meetingResidenceLat}))*sin(radians( meetingResidenceLat)))) AS distance ` +
        `FROM meeting_profile WHERE userId NOT IN (${blockIdsStr}) ORDER BY distance ASC LIMIT ${startNum}, ${countPerPage}`;
      const nearListResult = await this.meetingProfileRepository.execute(query);
      nearList = nearListResult.map((v: any) => ({
        ...v,
        isOnline: onlineUserIds.indexOf(v.userId) !== -1,
      }));
      if (listType === 'nearList') return nearList;
    }

    // 매칭순(성별, 지역, 나이, 선호하는 만남, 체형. 키, 성격, 흡연)

    if(listType === 'main' || listType === 'matchList') {
      let otherLng = myProfile?.meetingOtherResidenceLng;
      let otherLat = myProfile?.meetingOtherResidenceLat;
      if (myProfile?.meetingOtherResidence && (!otherLng || !otherLat)) {
        const otherCord = await MeetingProfileController.getCoordinates(myProfile.meetingOtherResidence);
        await this.meetingProfileRepository.updateById(myProfile.id, {meetingOtherResidenceLat: otherCord.lat, meetingOtherResidenceLng: otherCord.lng});
        otherLng = otherCord.lng;
        otherLat = otherCord.lat;
      }
      const querySelect = `SELECT *, (6371*acos(cos(radians(${otherLat}))*cos(radians(meetingResidenceLat))*cos(radians(meetingResidenceLng)-radians(${otherLng}))+sin(radians(${otherLat}))*sin(radians( meetingResidenceLat)))) AS distance ` +
       `FROM meeting_profile WHERE userId NOT IN (${blockIdsStr}) `;
      let queryWhere = '';
      let queryAgeWhere = '';
      const queryOrder = ` ORDER BY distance ASC LIMIT ${startNum}, ${countPerPage}`;

      if (myProfile?.meetingOtherSex && myProfile?.meetingOtherSex !== '상관없음') {
        queryWhere += `AND sex='${myProfile?.meetingOtherSex}' `;
      }

      if (myProfile?.meetingOtherStartAge && myProfile?.meetingOtherEndAge) {
        queryAgeWhere = `AND age BETWEEN ${myProfile?.meetingOtherStartAge} AND ${myProfile?.meetingOtherEndAge}`;
      }
      let matchListResult = await this.meetingProfileRepository.execute(querySelect + queryWhere + queryAgeWhere + queryOrder);

      if (matchListResult.length === 0 && myProfile?.meetingOtherStartAge && myProfile?.meetingOtherEndAge) {
        queryAgeWhere = `AND age BETWEEN ${myProfile?.meetingOtherStartAge - 5} AND ${myProfile?.meetingOtherEndAge + 5}`;
        matchListResult = await this.meetingProfileRepository.execute(querySelect + queryWhere + queryAgeWhere + queryOrder);
      }

      // matchListResult.sort((a: any, b: any) => {
      //   return (this.getMeetingMatchCount(myProfile, b) - this.getMeetingMatchCount(myProfile, a));
      // });
      matchList = matchListResult.map((v: any) => ({
        ...v,
        isOnline: onlineUserIds.indexOf(v.userId) !== -1,
      }));
      if (listType === 'matchList') return matchList;
    }

    return {
      meetingProfile: myProfile,
      popularList,
      nearList,
      matchList,
    };
  }


  @get('/meetings/request-chat')
  @secured(SecuredType.IS_AUTHENTICATED)
  async meetingRequestChat(
    @ws.namespace('main') nspMain: Server,
    @param.query.string('userId') userId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    if (userId === currentUser.userId) throw new HttpErrors.BadRequest('불가능한 요청입니다.');
    const pointSetting = await this.pointSettingRepository.findById(PointSettingType.POINT_MEETING_CHAT);
    const requestFlower = pointSetting.pointSettingAmount;

    const hasMeetingPass = await this.flowerController.hasUsagePass(currentUser.userId, ServiceType.MEETING);
    if (!hasMeetingPass && (currentUser.payFlower + currentUser.freeFlower) < requestFlower) {
      throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    }
    const myMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    const otherUserMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: userId}});
    let chatContactInfo = await this.chatContactRepository.findOne({
      where: {
        or: [
          {contactUserId: currentUser.userId, contactOtherUserId: userId, contactServiceType: ServiceType.MEETING},
          {contactUserId: userId, contactOtherUserId: currentUser.userId, contactServiceType: ServiceType.MEETING},
        ],
      },
    });
    if (!chatContactInfo) {
      chatContactInfo = await this.chatContactRepository.create({
        contactUserId: currentUser.userId,
        contactOtherUserId: userId,
        contactStatus: ContactStatus.REQUEST,
        contactOtherStatus: ContactStatus.REQUESTED,
        contactServiceType: ServiceType.MEETING,
        contactRequestNumber: 0,
      });
    } else {
      if (chatContactInfo.contactStatus !== ContactStatus.ALLOW && chatContactInfo.contactStatus !== ContactStatus.REQUEST && chatContactInfo.contactRequestNumber < 2) {
        // 3번이하로 시도했으면
        await this.chatContactRepository.updateById(chatContactInfo.id, {
          contactStatus: ContactStatus.REQUEST,
          contactOtherStatus: ContactStatus.REQUESTED,
          contactRequestNumber: chatContactInfo.contactRequestNumber + 1,
        });
      } else {
        throw new HttpErrors.BadRequest('대화신청을 할수 없습니다.');
      }
    }

    if (!hasMeetingPass) {
      const updateFlowerInfo = Utils.calcUseFlower(currentUser.freeFlower, currentUser.payFlower, requestFlower);
      await this.userRepository.updateById(currentUser.userId, {freeFlower: updateFlowerInfo.updateFlower.freeFlower, payFlower: updateFlowerInfo.updateFlower.payFlower});
      await this.flowerHistoryRepository.createAll(updateFlowerInfo.history.map((v: any) => ({
        flowerUserId: currentUser.userId,
        flowerContent: otherUserMeetingInfo?.meetingNickname + '님에게 대화신청',
        flowerValue: v.flowerValue,
        isFreeFlower: v.isFreeFlower,
        flowerHistoryType: FlowerHistoryType.REQUEST_CHAT,
        flowerHistoryRefer: chatContactInfo?.id,
      })));
    }
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: userId,
      notificationMsg: myMeetingInfo?.meetingNickname + '님이 대화를 신청했어요',
      notificationType: NotificationType.CHAT_REQUEST,
      notificationServiceType: ServiceType.MEETING,
    });

    nspMain.to(userId).emit(MainSocketMsgType.SRV_REQUEST_CHAT, {
      callUserId: currentUser.userId,
      callUserName: myMeetingInfo?.meetingNickname,
      callUserProfile: myMeetingInfo?.meetingPhotoMain,
      contactId: chatContactInfo.id,
      chatType: ChatType.MEETING_CHAT,
    });
    await this.notificationController.sendPushNotification(userId, myMeetingInfo?.meetingNickname + '님', myMeetingInfo?.meetingNickname + '님이 대화를 신청했어요');
  }
}

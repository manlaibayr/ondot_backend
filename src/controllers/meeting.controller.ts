import {repository} from '@loopback/repository';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {get, HttpErrors, param} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {BlockPhoneRepository, ChatContactRepository, FlowerHistoryRepository, MeetingProfileRepository, NotificationRepository, UserRepository} from '../repositories';
import {ChatType, ContactStatus, MainSocketMsgType, NotificationType, ServiceType, UserCredentials} from '../types';
import {Namespace, Server} from 'socket.io';
import {ws} from '../websockets/decorators/websocket.decorator';
import {FlowerController} from './flower.controller';
import {Utils} from '../utils';
import {MeetingProfile} from '../models';

export class MeetingController {
  constructor(
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @repository(BlockPhoneRepository) public blockPhoneRepository: BlockPhoneRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(`controllers.FlowerController`) private flowerController: FlowerController
  ) {
  }

  getMatchCount(
    myProfile: any,
    otherProfile: any,
  ): number {
    const keys = [
      {myStartKey: 'meetingOtherStartAge', myEndKey: 'meetingOtherEndAge', otherKey: 'age'},
      {myKey: 'meetingOtherResidence', otherKey: 'meetingResidence'},
      {myKey: 'meetingOtherMeeting', otherKey: 'meetingMeeting'},
      {myKey: 'meetingOtherBodyType', otherKey: 'meetingBodyType'},
      {myStartKey: 'meetingOtherStartHeight', myEndKey: 'meetingOtherEndHeight', otherKey: 'meetingHeight'},
      {myKey: 'meetingOtherSex', otherKey: 'sex'},
      {myKey: 'meetingOtherPersonality', otherKey: 'meetingPersonality'},
      {myKey: 'meetingOtherSmoking', otherKey: 'meetingSmoking'},
    ]
    let matchCount = 0;
    keys.forEach((v: any) => {
      if(v.myKey && v.myKey.indexOf('Residence') !== -1) {
        if(otherProfile[v.otherKey].indexOf(myProfile[v.myKey])) matchCount++;
      } else if(v.myKey) {
        if(myProfile[v.myKey] === otherProfile[v.otherKey]) matchCount++;
      } else if (v.myStartKey && v.myEndKey) {
        if(myProfile[v.myStartKey] <= otherProfile[v.otherKey] && myProfile[v.myEndKey] >= otherProfile[v.otherKey]) matchCount++;
      }
    });
    return matchCount;
  }

  getDistance(
    myProfile: any,
    otherProfile: any,
  ): number {
    if(!myProfile.meetingResidenceLat || !myProfile.meetingResidenceLng || !otherProfile.meetingResidenceLat || !otherProfile.meetingResidenceLng) return 999999;
    const toRad = (value: number) => {
      return value * Math.PI / 180;
    };
    const R = 6371; // km
    const dLat = toRad(otherProfile.meetingResidenceLat - myProfile.meetingResidenceLat);
    const dLon = toRad(otherProfile.meetingResidenceLng - myProfile.meetingResidenceLng);
    const lat1 = toRad(myProfile.meetingResidenceLat);
    const lat2 = toRad(otherProfile.meetingResidenceLat);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  @get('/meetings/main')
  @secured(SecuredType.IS_AUTHENTICATED)
  async meetingMain(
    @ws.namespace('main') nspMain: Namespace,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const myProfile = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    // 지인차단
    const blockPhones = await this.blockPhoneRepository.find({where: {blockPhoneUserId: currentUser.userId}});
    const blockUsers = await this.userRepository.find({where: {phoneNumber: {inq: blockPhones.map((v) => v.blockPhoneNum)}}});
    const blokcIds = blockUsers.map((v) => v.id);
    blokcIds.push(currentUser.userId);
    const profileList = await this.meetingProfileRepository.find({where: {userId: {nin: blokcIds}}});

    //인기순
    const popularList = profileList.slice(0, 15).map((v) => JSON.parse(JSON.stringify(v.toJSON())));

    // 매칭순
    profileList.sort((a: any, b: any) => {
      return (this.getMatchCount(myProfile, b) - this.getMatchCount(myProfile, a));
    });
    const matchList = profileList.slice(0, 15).map((v) => JSON.parse(JSON.stringify(v.toJSON())));
    // 거리순
    profileList.sort((a: any, b: any) => {
      return (this.getDistance(myProfile, b) - this.getMatchCount(myProfile, a));
    });
    const nearList = profileList.slice(0, 15).map((v) => JSON.parse(JSON.stringify(v.toJSON())));
    // 인기순

    // 접속한 회원 리스트
    const rooms: any = nspMain.adapter.rooms;
    const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');
    profileList.forEach((v) => {
      const info: any = v.toJSON();
      info.isOnline = onlineUserIds.indexOf(v.userId) !== -1;
      profileList.push(info);
    });

    const data = {
      meetingProfile: myProfile,
      popularList,
      nearList,
      matchList,
    };
    return data;
  }

  @get('/meetings/request-chat')
  @secured(SecuredType.IS_AUTHENTICATED)
  async meetingRequestChat(
    @ws.namespace('main') nspMain: Server,
    @param.query.string('userId') userId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const requestFlower = 3;

    const hasMeetingPass = await this.flowerController.hasUsagePass(currentUser.userId, ServiceType.MEETING);
    if (!hasMeetingPass && (currentUser.payFlower + currentUser.freeFlower) < requestFlower) {
      throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    }
    const myMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    const otherUserMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: userId}});
    if(!hasMeetingPass) {
      const updateFlowerInfo = Utils.calcUseFlower(currentUser.freeFlower, currentUser.payFlower, requestFlower);
      await this.userRepository.updateById(currentUser.userId, {freeFlower: updateFlowerInfo.updateFlower.freeFlower, payFlower: updateFlowerInfo.updateFlower.payFlower});
      await this.flowerHistoryRepository.createAll(updateFlowerInfo.history.map((v: any) => ({
        flowerUserId: currentUser.userId,
        flowerContent: otherUserMeetingInfo?.meetingNickname + '님에게 대화신청',
        flowerValue: v.flowerValue,
        isFreeFlower: v.isFreeFlower
      })));
    }
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: userId,
      notificationMsg: myMeetingInfo?.meetingNickname + '님이 대화신청을 보냈습니다.',
      notificationType: NotificationType.CHAT_REQUEST,
      notificationServiceType: ServiceType.MEETING,
    });
    let chatContactInfo = await this.chatContactRepository.findOne({
      where: {
        or: [
          {contactUserId: currentUser.userId, contactOtherUserId: userId, contactServiceType: ServiceType.MEETING},
          {contactUserId: userId, contactOtherUserId: currentUser.userId, contactServiceType: ServiceType.MEETING}
        ],
      },
    });
    if (!chatContactInfo) {
      chatContactInfo = await this.chatContactRepository.create({
        contactUserId: currentUser.userId,
        contactOtherUserId: userId,
        contactStatus: ContactStatus.REQUEST,
        contactOtherStatus: ContactStatus.REQUESTED,
        contactServiceType: ServiceType.MEETING
      });
    }
    nspMain.to(userId).emit(MainSocketMsgType.SRV_REQUEST_CHAT, {
      callUserId: currentUser.userId,
      callUserName: myMeetingInfo?.meetingNickname,
      callUserProfile: myMeetingInfo?.meetingPhotoMain,
      contactId: chatContactInfo.id,
      chatType: ChatType.HOBBY_CHAT
    });
  }
}

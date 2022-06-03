import {repository} from '@loopback/repository';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {get, HttpErrors, param} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {BlockPhoneRepository, ChatContactRepository, FlowerHistoryRepository, MeetingProfileRepository, NotificationRepository, UserRepository} from '../repositories';
import {ContactStatus, MainSocketMsgType, NotificationType, ServiceType, UserCredentials} from '../types';
import {Namespace, Server} from 'socket.io';
import {ws} from '../websockets/decorators/websocket.decorator';

export class MeetingController {
  constructor(
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @repository(BlockPhoneRepository) public blockPhoneRepository: BlockPhoneRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @get('/meetings/main')
  @secured(SecuredType.IS_AUTHENTICATED)
  async meetingMain(
    @ws.namespace('main') nspMain: Namespace,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    // 지인차단
    const blockPhones = await this.blockPhoneRepository.find({where: {blockPhoneUserId: currentUser.userId}});
    const blockUsers = await this.userRepository.find({where: {phoneNumber: {inq: blockPhones.map((v) => v.blockPhoneNum)}}});
    const userList = await this.meetingProfileRepository.find({where: {userId: {nin: blockUsers.map((v) => v.id)}}});
    const i = userList.findIndex((v) => v.userId === currentUser.userId);
    const myProfile = i !== -1 ? userList.splice(i, 1)[0] : null;
    const profileList: any = [];
    // 접속한 회원 리스트
    const rooms: any = nspMain.adapter.rooms;
    const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');
    userList.forEach((v) => {
      const info: any = v.toJSON();
      info.isOnline = onlineUserIds.indexOf(v.userId) !== -1;
      profileList.push(info);
    });

    const data = {
      meetingProfile: myProfile,
      popularList: profileList.splice(0, 5),
      nearList: profileList.splice(5, 10),
      matchList: profileList.splice(15, 10),
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
    const myInfo = await this.userRepository.findById(currentUser.userId);
    if (myInfo.userFlower < requestFlower) {
      throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    }
    const myMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    const otherUserMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: userId}});
    await this.userRepository.updateById(currentUser.userId, {userFlower: myInfo.userFlower - requestFlower});
    await this.flowerHistoryRepository.create({
      flowerUserId: currentUser.userId,
      flowerContent: otherUserMeetingInfo?.meetingNickname + '님에게 대화신청',
      flowerValue: -requestFlower,
    });
    const notificationInfo = await this.notificationRepository.create({
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
    });
  }
}

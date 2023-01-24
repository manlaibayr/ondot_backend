import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param, post, Request, requestBody, Response, RestBindings} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {
  BlockUserRepository,
  ChatContactRepository,
  ChatGroupMsgRepository,
  ChatMsgRepository,
  HobbyProfileRepository,
  HobbyRoomMemberRepository,
  HobbyRoomRepository,
  LearningProfileRepository,
  MeetingProfileRepository,
  NotificationRepository,
  UserRepository,
} from '../repositories';
import {ChatMsgStatus, ChatMsgType, ChatSocketMsgType, ChatType, ContactStatus, FileUploadHandler, MainSocketMsgType, RoomMemberJoinType, ServiceType, UserCredentials} from '../types';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Namespace, Server} from 'socket.io';
import {ChatContact} from '../models';
import moment from 'moment';
import {Utils} from '../utils';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {LearningProfileController} from './learning-profile.controller';
import {NotificationController} from './notification.controller';

export class ChatController {
  constructor(
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @repository(ChatMsgRepository) public chatMsgRepository: ChatMsgRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(HobbyProfileRepository) public hobbyProfileRepository: HobbyProfileRepository,
    @repository(LearningProfileRepository) public learningProfileRepository: LearningProfileRepository,
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @repository(HobbyRoomMemberRepository) public hobbyRoomMemberRepository: HobbyRoomMemberRepository,
    @repository(ChatGroupMsgRepository) public chatGroupMsgRepository: ChatGroupMsgRepository,
    @repository(BlockUserRepository) public blockUserRepository: BlockUserRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(`controllers.NotificationController`) private notificationController: NotificationController,
    @inject(FILE_UPLOAD_SERVICE) private fileUploadHandler: FileUploadHandler,
  ) {
  }

  getContactStatusStr = (isSelf: boolean, info: ChatContact) => {
    const status: ContactStatus = isSelf ? info.contactStatus : info.contactOtherStatus;
    const otherUserStatus: ContactStatus = !isSelf ? info.contactStatus : info.contactOtherStatus;
    if (status === ContactStatus.ALLOW) {
      return otherUserStatus === ContactStatus.DELETE ? '채팅종료' : null;
    } else {
      return status;
    }
  };

  @get('/chats/contact-change')
  @secured(SecuredType.IS_AUTHENTICATED)
  async allowChat(
    @ws.namespace('main') nspMain: Server,
    @ws.namespace('chat') nspChat: Server,
    @param.query.string('chatContactId') chatContactId: string,
    @param.query.string('type') type: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const contactInfo = await this.chatContactRepository.findById(chatContactId);
    const otherUserId = contactInfo.contactUserId === currentUser.userId ? contactInfo.contactOtherUserId : contactInfo.contactUserId;
    if (currentUser.userId !== contactInfo.contactOtherUserId && currentUser.userId !== contactInfo.contactUserId) throw new HttpErrors.BadRequest('요청이 승인되지 않았습니다.');
    if (type === 'allow') {
      await this.chatContactRepository.updateById(chatContactId, {contactStatus: ContactStatus.ALLOW, contactOtherStatus: ContactStatus.ALLOW});
      const myMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
      nspMain.to(otherUserId).emit(MainSocketMsgType.SRV_ALLOW_CHAT, {
        callUserId: currentUser.userId,
        callUserName: myMeetingInfo?.meetingNickname,
        callUserProfile: myMeetingInfo?.meetingPhotoMain,
        contactId: chatContactId,
        chatType: ChatType.MEETING_CHAT,
      });
      nspChat.to(chatContactId).emit(ChatSocketMsgType.SRV_CONTACT_CHANGE, {});
      await this.notificationController.sendPushNotification(otherUserId, myMeetingInfo?.meetingNickname + '님', myMeetingInfo?.meetingNickname + '님이 대화를 수락했어요.');
    } else if (type === 'reject') {
      await this.chatContactRepository.updateById(chatContactId, {
        contactStatus: contactInfo.contactUserId === currentUser.userId ? ContactStatus.REJECT : ContactStatus.REJECTED,
        contactOtherStatus: contactInfo.contactOtherUserId === currentUser.userId ? ContactStatus.REJECT : ContactStatus.REJECTED,
      });
    } else if (type === 'delete') {
      await this.chatContactRepository.updateById(chatContactId, {
        contactStatus: contactInfo.contactUserId === currentUser.userId ? ContactStatus.DELETE : contactInfo.contactStatus,
        contactOtherStatus: contactInfo.contactOtherUserId === currentUser.userId ? ContactStatus.DELETE : contactInfo.contactOtherStatus,
      });
      await this.chatMsgRepository.updateAll({msgSenderStatus: ChatMsgStatus.DELETE}, {chatContactId, senderUserId: currentUser.userId});
      await this.chatMsgRepository.updateAll({msgReceiverStatus: ChatMsgStatus.DELETE}, {chatContactId, receiverUserId: currentUser.userId});
      nspChat.to(chatContactId).emit(ChatSocketMsgType.SRV_CONTACT_CHANGE, {});
    } else {
      return;
    }
    nspMain.to(otherUserId).emit(MainSocketMsgType.SRV_CHANGE_CONTACT_LIST, {});
  }

  @get('/chats/contact-list')
  @secured(SecuredType.IS_AUTHENTICATED)
  async meetingChatList(
    @ws.namespace('main') nspMain: Namespace,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const contactListResult = await this.chatContactRepository.find({
      where: {or: [{contactUserId: currentUser.userId, contactStatus: {neq: ContactStatus.DELETE}}, {contactOtherUserId: currentUser.userId, contactOtherStatus: {neq: ContactStatus.DELETE}}]},
    });

    const contactList = contactListResult.map((v) => ({
      id: v.id,
      otherUserId: v.contactUserId !== currentUser.userId ? v.contactUserId : v.contactOtherUserId,
      status: v.contactStatus,
      statusStr: this.getContactStatusStr(v.contactUserId === currentUser.userId, v),
      contactServiceType: v.contactServiceType,
      createdAt: v.createdAt,
    }));
    // 접속한 회원 리스트
    const rooms: any = nspMain.adapter.rooms;
    const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');

    // 블록된 회원리스트
    const blockList = await this.blockUserRepository.find({where: {blockUserId: currentUser.userId, blockServiceType: ServiceType.MEETING}});
    const meetingObjs = contactList.filter((v) => (v.contactServiceType === ServiceType.MEETING && !blockList.some((vv) => (vv.blockOtherUserId === v.otherUserId && vv.blockServiceType === ServiceType.MEETING))));
    const meetingProfileList = await this.meetingProfileRepository.find({where: {userId: {inq: meetingObjs.map((v) => v.otherUserId)}}});
    const meetingContacts = [];
    for (const v of meetingObjs) {
      const findObj = meetingProfileList.find((p) => p.userId === v.otherUserId);
      const unReadCount = await this.chatMsgRepository.count({chatContactId: v.id, receiverUserId: currentUser.userId, msgReceiverStatus: ChatMsgStatus.UNREAD});
      const lastChat = await this.chatMsgRepository.findOne({where: {chatContactId: v.id}, order: ['createdAt desc']});
      meetingContacts.push({
        ...v,
        nickname: findObj?.meetingNickname,
        profile: findObj?.meetingPhotoMain,
        lastMsg: lastChat?.msgType === ChatMsgType.TEXT ? lastChat?.msgContent : lastChat?.msgType,
        unreadCount: unReadCount.count,
        isOnline: onlineUserIds.indexOf(v.otherUserId) !== -1,
        chatType: ChatType.MEETING_CHAT,
        lastChatTime: lastChat?.createdAt ? lastChat.createdAt : v.createdAt,
      });
    }

    const hobbyObjs = contactList.filter((v) => v.contactServiceType === ServiceType.HOBBY);
    const hobbyProfileList = await this.hobbyProfileRepository.find({where: {userId: {inq: hobbyObjs.map((v) => v.otherUserId)}}});
    const hobbyContacts = [];
    for (const v of hobbyObjs) {
      const findObj = hobbyProfileList.find((p) => p.userId === v.otherUserId);
      const unReadCount = await this.chatMsgRepository.count({chatContactId: v.id, receiverUserId: currentUser.userId, msgReceiverStatus: ChatMsgStatus.UNREAD});
      const lastChat = await this.chatMsgRepository.findOne({where: {chatContactId: v.id}, order: ['createdAt desc']});
      hobbyContacts.push({
        ...v,
        nickname: findObj?.hobbyNickname,
        profile: findObj?.hobbyPhoto,
        lastMsg: lastChat?.msgType === ChatMsgType.TEXT ? lastChat?.msgContent : lastChat?.msgType,
        unreadCount: unReadCount.count,
        isOnline: onlineUserIds.indexOf(v.otherUserId) !== -1,
        chatType: ChatType.HOBBY_CHAT,
        lastChatTime: lastChat?.createdAt ? lastChat.createdAt : v.createdAt,
      });
    }

    const roomList = await this.hobbyRoomMemberRepository.find({where: {memberUserId: currentUser.userId, memberJoinStatus: {neq: RoomMemberJoinType.KICK}}, include: [{relation: 'hobbyRoom'}]});
    const hobbyRoomContacts = await Promise.all(roomList.map(async (r) => {
      const lastChat = await this.chatGroupMsgRepository.findOne({where: {groupRoomId: r.id}, order: ['createdAt desc']});
      return {
        id: r.roomId,
        roomTitle: r.hobbyRoom?.roomTitle,
        roomRegion: r.hobbyRoom?.roomRegion,
        roomMemberNumber: r.hobbyRoom?.roomMemberNumber,
        roomPhotoMain: r.hobbyRoom?.roomPhotoMain,
        isRoomDelete: r.hobbyRoom?.isRoomDelete,
        chatType: ChatType.HOBBY_ROOM_CHAT,
        lastChatTime: lastChat?.createdAt ? lastChat.createdAt : r.createdAt,
      };
    }));
    const totalHobbyContactList: any[] = [...hobbyContacts, ...hobbyRoomContacts];

    const learningObjs = contactList.filter((v) => (v.contactServiceType === ServiceType.LEARNING && !blockList.some((vv) => (vv.blockOtherUserId === v.otherUserId && vv.blockServiceType === ServiceType.LEARNING))));
    const learningProfileList = await this.learningProfileRepository.find({where: {userId: {inq: learningObjs.map((v) => v.otherUserId)}}});
    const learningContacts = [];
    for (const v of learningObjs) {
      const findObj = learningProfileList.find((p) => p.userId === v.otherUserId);
      const unReadCount = await this.chatMsgRepository.count({chatContactId: v.id, receiverUserId: currentUser.userId, msgReceiverStatus: ChatMsgStatus.UNREAD});
      const lastChat = await this.chatMsgRepository.findOne({where: {chatContactId: v.id}, order: ['createdAt desc']});
      learningContacts.push({
        ...v,
        nickname: findObj?.learningNickname,
        profile: LearningProfileController.getStudentProfile(findObj),
        lastMsg: lastChat?.msgType === ChatMsgType.TEXT ? lastChat?.msgContent : lastChat?.msgType,
        unreadCount: unReadCount.count,
        isOnline: onlineUserIds.indexOf(v.otherUserId) !== -1,
        chatType: ChatType.LEARNING_CHAT,
        lastChatTime: lastChat?.createdAt ? lastChat.createdAt : v.createdAt,
      });
    }


    meetingContacts.sort((a: any, b: any) => (moment(b.lastChatTime).isSame(a.lastChatTime)) ? 0 : ((moment(b.lastChatTime).isAfter(a.lastChatTime)) ? 1 : -1));
    totalHobbyContactList.sort((a: any, b: any) => (moment(b.lastChatTime).isSame(a.lastChatTime)) ? 0 : ((moment(b.lastChatTime).isAfter(a.lastChatTime)) ? 1 : -1));
    return {meeting: meetingContacts, hobby: totalHobbyContactList, learning: learningContacts};
  }

  @post('/chats/upload-file')
  @secured(SecuredType.IS_AUTHENTICATED)
  async uploadFile(
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) resp: Response,
  ) {
    const uploadPath: string = 'chat/' + moment().format('YYYYMM');
    const uploadFiles = await new Promise<any[]>((resolve, reject) => {
      this.fileUploadHandler(request, resp, (err: unknown) => {
        if (err) reject(err);
        else {
          resolve(Utils.getFilesAndFields(request, uploadPath));
        }
      });
    });
    for(const f of uploadFiles) {
      await Utils.makeThumb(f.path);
    }
    return uploadFiles.map((v) => v.urlPath).join(',');
  }

  @get('/chats/unread-count')
  @secured(SecuredType.IS_AUTHENTICATED)
  async unreadCount() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const contactListResult = await this.chatContactRepository.find({
      where: {or: [{contactUserId: currentUser.userId, contactStatus: {neq: ContactStatus.DELETE}}, {contactOtherUserId: currentUser.userId, contactOtherStatus: {neq: ContactStatus.DELETE}}]},
    });
    const contactIds = contactListResult.map((v) => v.id);
    const chatCount = await this.chatMsgRepository.count({chatContactId: {inq: contactIds}, receiverUserId: currentUser.userId, msgReceiverStatus: ChatMsgStatus.UNREAD});
    return chatCount.count;
  }
}

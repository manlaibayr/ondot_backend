import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param, post, Request, requestBody, Response, RestBindings} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {
  ChatContactRepository,
  ChatGroupMsgRepository,
  ChatMsgRepository,
  HobbyProfileRepository,
  HobbyRoomMemberRepository,
  HobbyRoomRepository,
  MeetingProfileRepository,
  NotificationRepository,
} from '../repositories';
import {ChatMsgStatus, ChatMsgType, ChatSocketMsgType, ChatType, ContactStatus, FileUploadHandler, MainSocketMsgType, RoomMemberJoinType, ServiceType, UserCredentials} from '../types';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Namespace, Server} from 'socket.io';
import {ChatContact} from '../models';
import moment from 'moment';
import {Utils} from '../utils';
import {FILE_UPLOAD_SERVICE} from '../keys';

export class ChatController {
  constructor(
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @repository(ChatMsgRepository) public chatMsgRepository: ChatMsgRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(HobbyProfileRepository) public hobbyProfileRepository: HobbyProfileRepository,
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @repository(HobbyRoomMemberRepository) public hobbyRoomMemberRepository: HobbyRoomMemberRepository,
    @repository(ChatGroupMsgRepository) public chatGroupMsgRepository: ChatGroupMsgRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(FILE_UPLOAD_SERVICE) private fileUploadHandler: FileUploadHandler,
  ) {
  }

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
    const getStatusStr = (isSelf: boolean, info: ChatContact) => {
      const status: ContactStatus = isSelf ? info.contactStatus : info.contactOtherStatus;
      const otherUserStatus: ContactStatus = !isSelf ? info.contactStatus : info.contactOtherStatus;
      if (status === ContactStatus.ALLOW) {
        return otherUserStatus === ContactStatus.DELETE ? '채팅종료' : null;
      } else {
        return status;
      }
    };

    const contactList = contactListResult.map((v) => ({
      id: v.id,
      otherUserId: v.contactUserId !== currentUser.userId ? v.contactUserId : v.contactOtherUserId,
      status: v.contactStatus,
      statusStr: getStatusStr(v.contactUserId === currentUser.userId, v),
      contactServiceType: v.contactServiceType,
    }));
    // 접속한 회원 리스트
    const rooms: any = nspMain.adapter.rooms;
    const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');

    const meetingObjs = contactList.filter((v) => v.contactServiceType === ServiceType.MEETING);
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
        lastChatTime: lastChat?.createdAt,
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
        lastChatTime: lastChat?.createdAt,
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
        lastChatTime: lastChat?.createdAt,
      };
    }));
    const totalHobbyContactList: any[] = [...hobbyContacts, ...hobbyRoomContacts];
    totalHobbyContactList.sort((x: any, y: any) => {
      return x.lastChatTime < y.lastChatTime ? -1 : x.lastChatTime > y.lastChatTime ? 1 : 0;
    });
    return {meeting: meetingContacts, hobby: totalHobbyContactList};
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
    return uploadFiles.map((v) => v.urlPath).join(',');
  }
}

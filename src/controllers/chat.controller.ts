import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {
  ChatContactRepository,
  ChatMsgRepository,
  HobbyRoomMemberRepository,
  HobbyRoomRepository,
  MeetingProfileRepository,
  NotificationRepository
} from '../repositories';
import {ChatMsgStatus, ChatSocketMsgType, ContactStatus, MainSocketMsgType, UserCredentials} from '../types';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Namespace, Server} from 'socket.io';
import {ChatContact} from '../models';

export class ChatController {
  constructor(
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @repository(ChatMsgRepository) public chatMsgRepository: ChatMsgRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @repository(HobbyRoomMemberRepository) public hobbyRoomMemberRepository: HobbyRoomMemberRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
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
      where: {or: [{contactUserId: currentUser.userId, contactStatus: {neq: ContactStatus.DELETE}}, {contactOtherUserId: currentUser.userId, contactOtherStatus: {neq: ContactStatus.DELETE}}]}
    });
    const getStatusStr = (isSelf: boolean, info: ChatContact) => {
      const status: ContactStatus = isSelf ? info.contactStatus : info.contactOtherStatus;
      const otherUserStatus: ContactStatus = !isSelf ? info.contactStatus : info.contactOtherStatus;
      if(status === ContactStatus.ALLOW) {
        return otherUserStatus === ContactStatus.DELETE ? '채팅종료' : null
      } else {
        return status;
      }
    };

    const contactList = contactListResult.map((v) => ({
      id: v.id,
      otherUserId: v.contactUserId !== currentUser.userId ? v.contactUserId : v.contactOtherUserId,
      status: v.contactStatus,
      statusStr: getStatusStr(v.contactUserId === currentUser.userId, v),
    }));
    const meetingProfileList = await this.meetingProfileRepository.find({where: {userId: {inq: contactList.map((v) => v.otherUserId)}}});
    // 접속한 회원 리스트
    const rooms: any = nspMain.adapter.rooms;
    const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');
    const meetingContacts = [];
    for (const v of contactList) {
      const findObj = meetingProfileList.find((p) => p.userId === v.otherUserId);
      const unReadCount = await this.chatMsgRepository.count({chatContactId: v.id, receiverUserId: currentUser.userId, msgReceiverStatus: ChatMsgStatus.UNREAD});
      const lastChat = await this.chatMsgRepository.findOne({where: {chatContactId: v.id}, order: ['createdAt desc']});
      meetingContacts.push({
        ...v,
        nickname: findObj?.meetingNickname,
        profile: findObj?.meetingPhotoMain,
        lastMsg: lastChat?.msgContent,
        unreadCount: unReadCount.count,
        isOnline: onlineUserIds.indexOf(v.otherUserId) !== -1,
      });
    }
    const roomList = await this.hobbyRoomMemberRepository.find({where: {memberUserId: currentUser.userId}, include: [{relation: 'hobbyRoom'}]});
    const hobbyContacts = roomList.map((r) => ({
      id: r.roomId,
      roomTitle: r.hobbyRoom?.roomTitle,
      roomRegion: r.hobbyRoom?.roomRegion,
      roomMemberNumber: r.hobbyRoom?.roomMemberNumber,
      roomPhotoMain: r.hobbyRoom?.roomPhotoMain,
    }));
    return {meeting: meetingContacts, hobby: hobbyContacts};
  }
}

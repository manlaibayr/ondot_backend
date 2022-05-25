import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {ChatContactRepository, ChatMsgRepository, MeetingProfileRepository, NotificationRepository} from '../repositories';
import {ContactStatus, UserCredentials} from '../types';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Namespace, Server} from 'socket.io';

export class ChatController {
  constructor(
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @repository(ChatMsgRepository) public chatMsgRepository: ChatMsgRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @get('/chats/contact-change')
  @secured(SecuredType.IS_AUTHENTICATED)
  async allowChat(
    @ws.namespace('main') nspMain: Server,
    @param.query.string('chatContactId') chatContactId: string,
    @param.query.string('type') type: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const contactInfo = await this.chatContactRepository.findById(chatContactId);
    if(currentUser.userId !== contactInfo.contactOtherUserId && currentUser.userId !== contactInfo.contactUserId ) throw new HttpErrors.BadRequest('요청이 승인되지 않았습니다.');
    let newStatus: ContactStatus;
    if(type === 'allow') {
      newStatus = ContactStatus.ALLOW;
    } else if(type === 'reject') {
      newStatus = ContactStatus.REJECT
    } else if(type === 'delete') {
      await this.chatContactRepository.updateById(chatContactId, {contactStatus: ContactStatus.DELETE});
      return;
    } else {
      return;
    }
    await this.chatContactRepository.updateById(chatContactId, {contactStatus: newStatus});
    nspMain.to(contactInfo.contactOtherUserId).emit('SRV_CONTACT_CHANGE', { chatContactId: chatContactId, status: newStatus});
  }

  @get('/chats/contact-list')
  @secured(SecuredType.IS_AUTHENTICATED)
  async meetingChatList(
    @ws.namespace('main') nspMain: Namespace,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const contactListResult = await this.chatContactRepository.find({where: {or: [{contactUserId: currentUser.userId}, {contactOtherUserId: currentUser.userId}]}});
    const getStatusStr = (isSelf: boolean, status: ContactStatus) => {
      if(status === ContactStatus.REQUEST) {
        return isSelf ? '신청중' : '승인대기중';
      } else if(status === ContactStatus.REJECT) {
        return isSelf ? '거부됨' : '거부함';
      } else if(status === ContactStatus.DELETE) {
        return '채팅종료';
      } else {
        return null;
      }
    };

    const contactList = contactListResult.map((v) => ({
      id: v.id,
      otherUserId: v.contactUserId !== currentUser.userId ? v.contactUserId : v.contactOtherUserId,
      status: v.contactStatus,
      statusStr: getStatusStr(v.contactUserId === currentUser.userId, v.contactStatus),
    }));
    const meetingProfileList = await this.meetingProfileRepository.find({where: {userId: {inq: contactList.map((v) => v.otherUserId)}}});
    // 접속한 회원 리스트
    const rooms: any = nspMain.adapter.rooms;
    const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');
    const result = [];
    for(const v of contactList) {
      const findObj = meetingProfileList.find((p) => p.userId === v.otherUserId);
      const unReadCount = await this.chatMsgRepository.count({chatContactId: v.id, receiverUserId: currentUser.userId, msgShow: false});
      result.push({
        ...v,
        nickname: findObj?.meetingNickname,
        profile: findObj?.meetingPhotoMain,
        lastMsg: '안녕하세요 대화 가능하신가요?',
        unreadCount: unReadCount.count,
        isOnline: onlineUserIds.indexOf(v.otherUserId) !== -1,
      });
    }
    return result;
  }
}

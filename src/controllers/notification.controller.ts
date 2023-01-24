import {repository} from '@loopback/repository';
import {ChatContactRepository, ChatMsgRepository, MeetingProfileRepository, NotificationRepository, UserRepository} from '../repositories';
import {del, get, HttpErrors, param} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {ChatMsgStatus, ContactStatus, ServiceType, UserCredentials} from '../types';
import {NotificationWithRelations} from '../models';
import {LearningProfileController} from './learning-profile.controller';
import * as firebaseAdmin from 'firebase-admin';
import {CONFIG} from '../config';
import {ChatController} from './chat.controller';

/**
 * firebase admin init
 */
firebaseAdmin.initializeApp({credential: firebaseAdmin.credential.cert(CONFIG.firebaseAdminServiceKey as firebaseAdmin.ServiceAccount)});

export class NotificationController {
  constructor(
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @repository(ChatMsgRepository) public chatMsgRepository: ChatMsgRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  public async sendPushNotification(userId: string, title: string, body: string) {
    const contactListResult = await this.chatContactRepository.find({
      where: {or: [{contactUserId: userId, contactStatus: {neq: ContactStatus.DELETE}}, {contactOtherUserId: userId, contactOtherStatus: {neq: ContactStatus.DELETE}}]},
    });
    const contactIds = contactListResult.map((v) => v.id);
    const chatCount = await this.chatMsgRepository.count({chatContactId: {inq: contactIds}, receiverUserId: userId, msgReceiverStatus: ChatMsgStatus.UNREAD});

    const unShowNotificationCount = await this.notificationRepository.count({notificationReceiveUserId: userId, notificationShow: false, notificationDelete: false});
    const badgeCount = chatCount.count + unShowNotificationCount.count;
    const userInfo = await this.userRepository.findById(userId, {fields: ['pushToken']});
    if(userInfo.pushToken) firebaseAdmin.messaging().sendToDevice(userInfo.pushToken , {notification: {title: title, body: body, badge: badgeCount.toString()}}).then(() => null).catch(() => null);
  }


  @get('/notifications/list')
  @secured(SecuredType.IS_AUTHENTICATED)
  async notificationData() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const meetingList: NotificationWithRelations[] = await this.notificationRepository.find({
      where: {notificationReceiveUserId: currentUser.userId, notificationDelete: false, notificationServiceType: ServiceType.MEETING},
      include: [{relation: "senderMeetingProfile"}],
      order: ['createdAt desc']
    });
    const meeting = meetingList.map((v) => ({
        ...v,
        notificationSenderUserId: v.notificationSendUserId,
        notificationReceiveUserId: v.notificationReceiveUserId,
        notificationMsg: v.notificationMsg,
        notificationType: v.notificationType,
        notificationShow: v.notificationShow,
        notificationDesc: v.notificationDesc,
        nickname: v.senderMeetingProfile?.meetingNickname,
        profile: v.senderMeetingProfile?.meetingPhotoMain,
      })
    );


    const learningList: NotificationWithRelations[] = await this.notificationRepository.find({
      where: {notificationReceiveUserId: currentUser.userId, notificationDelete: false, notificationServiceType: ServiceType.LEARNING},
      include: [{relation: "senderLearningProfile"}],
      order: ['createdAt desc']
    });
    const learning = learningList.map((v) => ({
      ...v,
      notificationSenderUserId: v.notificationSendUserId,
      notificationReceiveUserId: v.notificationReceiveUserId,
      notificationMsg: v.notificationMsg,
      notificationType: v.notificationType,
      notificationShow: v.notificationShow,
      notificationDesc: v.notificationDesc,
      nickname: v.senderLearningProfile?.learningNickname,
      profile: LearningProfileController.getStudentProfile(v.senderLearningProfile),
    }))

    const hobbyList: NotificationWithRelations[] = await this.notificationRepository.find({
      where: {notificationReceiveUserId: currentUser.userId, notificationDelete: false, notificationServiceType: ServiceType.HOBBY},
      include: [{relation: "senderHobbyProfile"}],
      order: ['createdAt desc']
    });
    const hobby = hobbyList.map((v) => ({
        ...v,
        notificationSenderUserId: v.notificationSendUserId,
        notificationReceiveUserId: v.notificationReceiveUserId,
        notificationMsg: v.notificationMsg,
        notificationType: v.notificationType,
        notificationShow: v.notificationShow,
        notificationDesc: v.notificationDesc,
        nickname: v.senderHobbyProfile?.hobbyNickname,
        profile: v.senderHobbyProfile?.hobbyPhoto,
      })
    );
    return { meeting, learning, hobby, common: []};
  }

  @get('/notifications/{id}/show')
  @secured(SecuredType.IS_AUTHENTICATED)
  async notificationShow(
    @param.path.string('id') id: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const notificationInfo = await this.notificationRepository.findById(id);
    if(notificationInfo.notificationReceiveUserId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    return this.notificationRepository.updateById(id, {notificationShow: true});
  }

  @get('notifications/unread-count')
  @secured(SecuredType.IS_AUTHENTICATED)
  async notificationUnReadCount() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const count = await this.notificationRepository.count({notificationReceiveUserId: currentUser.userId, notificationShow: false, notificationDelete: false});
    return {count: count.count};
  }


  @del('/notifications/del/{id}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async notificationDelete(
    @param.path.string('id') id: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const notificationInfo = await this.notificationRepository.findById(id);
    if(notificationInfo.notificationReceiveUserId === currentUser.userId) {
      await this.notificationRepository.updateById(id, {notificationDelete: true});
    }
  }
}

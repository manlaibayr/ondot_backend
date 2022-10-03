// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/core';


import {repository} from '@loopback/repository';
import {MeetingProfileRepository, NotificationRepository} from '../repositories';
import {del, get, HttpErrors, param} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {ServiceType, UserCredentials} from '../types';
import {NotificationWithRelations} from '../models';
import {LearningProfileController} from './learning-profile.controller';

export class NotificationController {
  constructor(
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
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
    return { meeting, learning, hobby};
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

// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/core';


import {repository} from '@loopback/repository';
import {MeetingProfileRepository, NotificationRepository} from '../repositories';
import {del, get, param} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {ServiceType, UserCredentials} from '../types';

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
    const list = await this.notificationRepository.find({where: {notificationReceiveUserId: currentUser.userId, notificationDelete: false}, order: ['createdAt desc']});
    const meetingList = list.filter((v) => v.notificationServiceType === ServiceType.MEETING);
    const meetingProfileList = await this.meetingProfileRepository.find({where: {userId: {inq: meetingList.map((v) => v.notificationSendUserId)}}});
    const meeting = meetingList.map((v) => {
      const findObj = meetingProfileList.find((p) => p.userId === v.notificationSendUserId);
      return {
        ...v,
        nickname: findObj?.meetingNickname,
        profile: findObj?.meetingPhotoMain,
      };
    });
    const learning = list.filter((v) => v.notificationServiceType === ServiceType.LEARNING);
    const hobby = list.filter((v) => v.notificationServiceType === ServiceType.HOBBY);
    return { meeting, learning, hobby};
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

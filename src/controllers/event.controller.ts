// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/core';


import {repository} from '@loopback/repository';
import {EventCommentRepository, EventRepository} from '../repositories';
import {del, get, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {secured, SecuredType} from '../role-authentication';
import {ServiceType, UserCredentials} from '../types';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {HttpError} from 'firebase-admin/lib/utils/api-request';

export class EventController {
  constructor(
    @repository(EventRepository) public eventRepository: EventRepository,
    @repository(EventCommentRepository) public eventCommentRepository: EventCommentRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @get('/events')
  @secured(SecuredType.IS_AUTHENTICATED)
  async find() {
    return this.eventRepository.find({where: {eventIsShow: true}, order: ['eventStartDate desc']});
  }

  @get('/events/{id}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async eventInfo(
    @param.path.string('id') id: string
  ) {
    return this.eventRepository.findById(id, {include: [{relation: 'eventComments'}]});
  }

  @get('/events/{id}/comments')
  @secured(SecuredType.IS_AUTHENTICATED)
  async eventCommentList(
    @param.path.string('id') id: string
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const eventCommentList = await this.eventCommentRepository.find({where: {eventCommentEventId: id}, order: ['createdAt desc'], include: [{relation: 'user',scope: {fields: ['username']}}]});
    return eventCommentList.map((v) => {
      const info = {
        id: v.id,
        isSelf: currentUser.userId === v.eventCommentUserId,
        sex: v.user?.sex,
        username: v.user?.username,
        commentText: v.eventCommentText,
        createdAt: v.createdAt,
      }
      if(info.username && info.username.length > 2) {
        info.username = info.username.substring(0, 1) + '*' + info.username.substring(2);
      }
      return info;
    });
  }

  @post('/events/{id}/comment')
  @secured(SecuredType.IS_AUTHENTICATED)
  async addEventComment(
    @param.path.string('id') id: string,
    @requestBody() data: {text: string},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    await this.eventCommentRepository.create({
      eventCommentUserId: currentUser.userId,
      eventCommentEventId: id,
      eventCommentText: data.text
    });
  }

  @patch('/events/comment/{id}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async updateEventComment(
    @param.path.string('id') eventCommentId: string,
    @requestBody() data: {text: string},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const eventCommentInfo = await this.eventCommentRepository.findById(eventCommentId);
    if(eventCommentInfo.eventCommentUserId !== currentUser.userId) {
      throw new HttpErrors.BadRequest('미팅 프로필이 존재하지 않습니다.');
    }
    await this.eventCommentRepository.updateById(eventCommentId, {eventCommentText: data.text});
  }


  @del('/events/{id}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async delEventComment(
    @param.path.string('id') eventCommentId: string
  ) {
    await this.eventCommentRepository.deleteById(eventCommentId);
  }
}

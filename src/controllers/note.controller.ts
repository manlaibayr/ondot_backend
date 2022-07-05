import {repository} from '@loopback/repository';
import {get, HttpErrors, param, post, requestBody} from '@loopback/rest';
import {FlowerHistoryRepository, MeetingProfileRepository, NoteRepository, NotificationRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {MainSocketMsgType, NotificationType, ServiceType, UserCredentials} from '../types';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Namespace} from 'socket.io';
import {FlowerController} from './flower.controller';

export class NoteController {
  constructor(
    @repository(NoteRepository) public noteRepository : NoteRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(`controllers.FlowerController`) private flowerController: FlowerController
  ) {}

  @get('/notes/{id}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async findNote(
    @param.path.string('id') id: string
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const noteInfo = await this.noteRepository.findById(id);
    if(noteInfo.noteUserId !== currentUser.userId && noteInfo.noteOtherUserId !== currentUser.userId) throw new HttpErrors.BadRequest('승인되지 않은 요청입니다.');
    return noteInfo;
  }

  @post('/notes/send')
  @secured(SecuredType.IS_AUTHENTICATED)
  async sendNote(
    @requestBody() data: {otherId: string, text: string},
    @ws.namespace('main') nspMain: Namespace,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const noteFlower = 2;
    const myInfo = await this.userRepository.findById(currentUser.userId);
    const hasMeetingPass = await this.flowerController.hasUsagePass(currentUser.userId, ServiceType.MEETING);
    if(!hasMeetingPass && myInfo.userFlower < noteFlower) {
      throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    }
    const meMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    const otherUserMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: data.otherId}});
    if(!hasMeetingPass) {
      await this.userRepository.updateById(currentUser.userId, {userFlower: myInfo.userFlower - noteFlower});
      await this.flowerHistoryRepository.create({
        flowerUserId: currentUser.userId,
        flowerContent: otherUserMeetingInfo?.meetingNickname + '님에게 쪽지를 보냈습니다.',
        flowerValue: -noteFlower,
      });
    }
    const noteInfo = await this.noteRepository.create({
      noteUserId: currentUser.userId,
      noteOtherUserId: data.otherId,
      noteMsg: data.text
    });
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: data.otherId,
      notificationMsg: meMeetingInfo?.meetingNickname + '님에게 쪽지를 받았습니다.',
      notificationType: NotificationType.NOTE,
      notificationServiceType: ServiceType.MEETING,
      notificationDesc: noteInfo.id
    });
    nspMain.to(data.otherId).emit(MainSocketMsgType.SRV_RECEIVE_NOTE, {
      userId: currentUser.userId, nickname: meMeetingInfo?.meetingNickname, profile: meMeetingInfo?.meetingPhotoMain, age: meMeetingInfo?.age, noteMsg: data.text, noteId: noteInfo.id
    });
  }

  @post('/notes/{id}/answer')
  @secured(SecuredType.IS_AUTHENTICATED)
  async answerNote(
    @param.path.string('id') id: string,
    @requestBody() data: {text: string},
    @ws.namespace('main') nspMain: Namespace,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const noteInfo = await this.noteRepository.findById(id);
    if(noteInfo.noteOtherUserId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    const meMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: noteInfo.noteUserId,
      notificationMsg: meMeetingInfo?.meetingNickname + '님에게 답변쪽지를 받으셨습니다.',
      notificationType: NotificationType.NOTE_ANSWER,
      notificationServiceType: ServiceType.MEETING,
      notificationDesc: noteInfo.id
    })
    await this.noteRepository.updateById(id, {noteAnswerMsg: data.text});
    nspMain.to(noteInfo.noteUserId).emit(MainSocketMsgType.SRV_RECEIVE_NOTE, {
      userId: currentUser.userId, nickname: meMeetingInfo?.meetingNickname, profile: meMeetingInfo?.meetingPhotoMain, age: meMeetingInfo?.age, noteMsg: data.text, noteAnswerMsg: data.text
    });
  }
}

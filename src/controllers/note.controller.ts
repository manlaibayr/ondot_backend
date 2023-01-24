import {repository} from '@loopback/repository';
import {get, HttpErrors, param, post, requestBody} from '@loopback/rest';
import {FlowerHistoryRepository, LearningProfileRepository, MeetingProfileRepository, NoteRepository, NotificationRepository, PointSettingRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {FlowerHistoryType, MainSocketMsgType, NotificationType, PointSettingType, ServiceType, UserCredentials} from '../types';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Namespace} from 'socket.io';
import {FlowerController} from './flower.controller';
import {Utils} from '../utils';
import {NotificationController} from './notification.controller';

export class NoteController {
  constructor(
    @repository(NoteRepository) public noteRepository: NoteRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(LearningProfileRepository) public learningProfileRepository: LearningProfileRepository,
    @repository(PointSettingRepository) public pointSettingRepository: PointSettingRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(`controllers.FlowerController`) private flowerController: FlowerController,
    @inject(`controllers.NotificationController`) private notificationController: NotificationController,
  ) {
  }

  @get('/notes/{id}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async findNote(
    @param.path.string('id') id: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const noteInfo = await this.noteRepository.findById(id);
    if (noteInfo.noteUserId !== currentUser.userId && noteInfo.noteOtherUserId !== currentUser.userId) throw new HttpErrors.BadRequest('승인되지 않은 요청입니다.');
    return noteInfo;
  }

  @post('/notes/send')
  @secured(SecuredType.IS_AUTHENTICATED)
  async sendNote(
    @requestBody() data: {otherId: string, text: string, serviceType: ServiceType},
    @ws.namespace('main') nspMain: Namespace,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    let nickname: string | undefined , noteId: string | undefined, profile: string | undefined, age: number | undefined;
    if (data.serviceType === ServiceType.MEETING) {
      const pointSetting = await this.pointSettingRepository.findById(PointSettingType.POINT_MEETING_NOTE);
      const noteFlower = pointSetting.pointSettingAmount;
      const hasMeetingPass = await this.flowerController.hasUsagePass(currentUser.userId, ServiceType.MEETING);
      if (!hasMeetingPass && (currentUser.payFlower + currentUser.freeFlower) < noteFlower) {
        throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
      }
      const meMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
      const otherUserMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: data.otherId}});
      const noteInfo = await this.noteRepository.create({
        noteUserId: currentUser.userId,
        noteOtherUserId: data.otherId,
        noteMsg: data.text,
        noteServiceType: data.serviceType
      });
      if (!hasMeetingPass) {
        const updateFlowerInfo = Utils.calcUseFlower(currentUser.freeFlower, currentUser.payFlower, noteFlower);
        await this.userRepository.updateById(currentUser.userId, {freeFlower: updateFlowerInfo.updateFlower.freeFlower, payFlower: updateFlowerInfo.updateFlower.payFlower});
        await this.flowerHistoryRepository.createAll(updateFlowerInfo.history.map((v: any) => ({
          flowerUserId: currentUser.userId,
          flowerContent: otherUserMeetingInfo?.meetingNickname + '님에게 쪽지를 보냈어요.',
          flowerValue: v.flowerValue,
          isFreeFlower: v.isFreeFlower,
          flowerHistoryType: FlowerHistoryType.SEND_NOTE,
          flowerHistoryRefer: noteInfo.id,
        })));
      }
      nickname = meMeetingInfo?.meetingNickname;
      noteId = noteInfo.id;
      profile = meMeetingInfo?.meetingPhotoMain;
      age = meMeetingInfo?.age;
    } else if (data.serviceType === ServiceType.LEARNING) {
      const meLearningInfo = await this.learningProfileRepository.findOne({where: {userId: currentUser.userId}});
      const noteInfo = await this.noteRepository.create({
        noteUserId: currentUser.userId,
        noteOtherUserId: data.otherId,
        noteMsg: data.text,
        noteServiceType: data.serviceType
      });
      nickname = meLearningInfo?.learningNickname;
      noteId = noteInfo.id;
      profile = meLearningInfo?.tchProfileMainPhoto;
      age = meLearningInfo?.age;
    } else {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: data.otherId,
      notificationMsg: nickname + '님이 쪽지를 보냈어요.',
      notificationType: NotificationType.NOTE,
      notificationServiceType: data.serviceType,
      notificationDesc: noteId,
    });
    nspMain.to(data.otherId).emit(MainSocketMsgType.SRV_RECEIVE_NOTE, {
      userId: currentUser.userId, nickname: nickname, profile: profile, age: age, noteMsg: data.text, noteId: noteId,
    });
    await this.notificationController.sendPushNotification(data.otherId, nickname + '님', nickname + '님이 쪽지를 보냈어요.');
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
    if (noteInfo.noteOtherUserId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    const meMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: noteInfo.noteUserId,
      notificationMsg: meMeetingInfo?.meetingNickname + '님이 답변을 보냈어요.',
      notificationType: NotificationType.NOTE_ANSWER,
      notificationServiceType: ServiceType.MEETING,
      notificationDesc: noteInfo.id,
    });
    await this.noteRepository.updateById(id, {noteAnswerMsg: data.text});
    nspMain.to(noteInfo.noteUserId).emit(MainSocketMsgType.SRV_RECEIVE_NOTE, {
      userId: currentUser.userId, nickname: meMeetingInfo?.meetingNickname, profile: meMeetingInfo?.meetingPhotoMain, age: meMeetingInfo?.age, noteMsg: data.text, noteAnswerMsg: data.text,
    });
    await this.notificationController.sendPushNotification(noteInfo.noteUserId, meMeetingInfo?.meetingNickname + '님', meMeetingInfo?.meetingNickname + '님이 답변을 보냈어요.');
  }
}

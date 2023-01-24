import {repository} from '@loopback/repository';
import {get, HttpErrors, param} from '@loopback/rest';
import {FlowerHistoryRepository, LikeRepository, MeetingProfileRepository, PointSettingRepository, UserRepository} from '../repositories';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {FlowerHistoryType, PointSettingType, ServiceType, UserCredentials} from '../types';
import {secured, SecuredType} from '../role-authentication';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Namespace} from 'socket.io';
import {FlowerController} from './flower.controller';
import {Utils} from '../utils';
import {NotificationController} from './notification.controller';

export class LikeController {
  constructor(
    @repository(LikeRepository) public likeRepository: LikeRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(PointSettingRepository) public pointSettingRepository: PointSettingRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(`controllers.FlowerController`) private flowerController: FlowerController,
    @inject(`controllers.NotificationController`) private notificationController: NotificationController,
  ) {
  }

  @get('/likes/add')
  @secured(SecuredType.IS_AUTHENTICATED)
  async create(
    @param.query.string('otherId') otherUserId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const pointSetting = await this.pointSettingRepository.findById(PointSettingType.POINT_MEETING_LIKE);
    const likeFlower = pointSetting.pointSettingAmount;

    const hasMeetingPass = await this.flowerController.hasUsagePass(currentUser.userId, ServiceType.MEETING);
    if (!hasMeetingPass && (currentUser.payFlower + currentUser.freeFlower) < likeFlower) {
      throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    }
    const alreadyInfo = await this.likeRepository.findOne({
      where: {
        likeUserId: currentUser.userId,
        likeOtherUserId: otherUserId,
        likeServiceType: ServiceType.MEETING,
      },
    });
    if (alreadyInfo) throw new HttpErrors.BadRequest('이미 좋아요 했습니다.');
    const otherUserMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: otherUserId}});
    const likeInfo = await this.likeRepository.create({
      likeUserId: currentUser.userId,
      likeOtherUserId: otherUserId,
      likeServiceType: ServiceType.MEETING,
    });
    const myMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    await this.notificationController.sendPushNotification(otherUserId, myMeetingInfo?.meetingNickname + '님', myMeetingInfo?.meetingNickname + '님이 좋아요를 눌렀어요')
    if(!hasMeetingPass) {
      const updateFlowerInfo = Utils.calcUseFlower(currentUser.freeFlower, currentUser.payFlower, likeFlower);
      await this.userRepository.updateById(currentUser.userId, {freeFlower: updateFlowerInfo.updateFlower.freeFlower, payFlower: updateFlowerInfo.updateFlower.payFlower});
      await this.flowerHistoryRepository.createAll(updateFlowerInfo.history.map((v: any) => ({
        flowerUserId: currentUser.userId,
        flowerContent: otherUserMeetingInfo?.meetingNickname + '님에게 좋아요함',
        flowerValue: v.flowerValue,
        isFreeFlower: v.isFreeFlower,
        flowerHistoryType: FlowerHistoryType.LIKE_USER,
        flowerHistoryRefer: likeInfo.id,
      })))
    }
    return likeInfo;
  }

  @get('/likes')
  @secured(SecuredType.IS_AUTHENTICATED)
  async likeFind(
    @ws.namespace('main') nspMain: Namespace,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const giveList = await this.likeRepository.find({
      where: {likeUserId: currentUser.userId, likeServiceType: ServiceType.MEETING},
      include: [{
        relation: 'likeOtherUser',
        scope: {
          include: [{relation: 'meetingProfile'}],
        },
      }],
    });
    const receiveList = await this.likeRepository.find({
      where: {likeOtherUserId: currentUser.userId, likeServiceType: ServiceType.MEETING},
      include: [{
        relation: 'likeUser',
        scope: {
          include: [{relation: 'meetingProfile'}],
        },
      }],
    });
    // 접속한 회원 리스트
    const rooms: any = nspMain.adapter.rooms;
    const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');

    const give = giveList.map((l) => ({
        isOnline: onlineUserIds.indexOf(l.likeOtherUserId) !== -1,
        userId: l.likeOtherUser?.id,
        meetingProfileId: l.likeOtherUser?.meetingProfileId,
        profile: l.likeOtherUser?.meetingProfile?.meetingPhotoMain,
        meetingNickname: l.likeOtherUser?.meetingProfile?.meetingNickname,
        meetingJob: l.likeOtherUser?.meetingProfile?.meetingJob,
        meetingOtherMeeting: l.likeOtherUser?.meetingProfile?.meetingOtherMeeting,
        meetingResidence: l.likeOtherUser?.meetingProfile?.meetingResidence,
    }));
    const receive = receiveList.map((l) => ({
      isOnline: onlineUserIds.indexOf(l.likeUserId) !== -1,
      userId: l.likeUser?.id,
      meetingProfileId: l.likeUser?.meetingProfileId,
      profile: l.likeUser?.meetingProfile?.meetingPhotoMain,
      meetingNickname: l.likeUser?.meetingProfile?.meetingNickname,
      meetingJob: l.likeUser?.meetingProfile?.meetingJob,
      meetingOtherMeeting: l.likeUser?.meetingProfile?.meetingOtherMeeting,
      meetingResidence: l.likeUser?.meetingProfile?.meetingResidence,
    }));
    return { give, receive};
  }
}

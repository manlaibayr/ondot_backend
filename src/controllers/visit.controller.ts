import {repository} from '@loopback/repository';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {get} from '@loopback/rest';
import {MeetingProfileRepository, UserRepository, VisitRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Namespace} from 'socket.io';
import {ServiceType, UserCredentials} from '../types';
import moment from 'moment';

export class VisitController {
  constructor(
    @repository(VisitRepository) public visitRepository: VisitRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @get('/visits')
  @secured(SecuredType.IS_AUTHENTICATED)
  async visitFind(
    @ws.namespace('main') nspMain: Namespace,
    ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    // 접속한 회원 리스트
    const rooms: any = nspMain.adapter.rooms;
    const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');

    const visitList = await this.visitRepository.find({
      where: {visitOtherUserId: currentUser.userId, visitServiceType: ServiceType.MEETING, visitLastTime: {gte: moment().subtract(48, 'hours').toDate()}},
      order: ['visitLastTime desc'],
      include: [{
        relation: 'visitUser',
        scope: {
          include: [{relation: 'meetingProfile'}],
        },
      }],
    });
    const visit = visitList.map((v) => ({
      isOnline: onlineUserIds.indexOf(v.visitUserId) !== -1,
      userId: v.visitUser?.id,
      visitLastTime: v.visitLastTime,
      meetingProfileId: v.visitUser?.meetingProfileId,
      profile: v.visitUser?.meetingProfile?.meetingPhotoMain,
      meetingNickname: v.visitUser?.meetingProfile?.meetingNickname,
      meetingJob: v.visitUser?.meetingProfile?.meetingJob,
      meetingOtherMeeting: v.visitUser?.meetingProfile?.meetingOtherMeeting,
      meetingResidence: v.visitUser?.meetingProfile?.meetingResidence,
    }));
    const todayCount = await this.visitRepository.count({visitOtherUserId: currentUser.userId, visitServiceType: ServiceType.MEETING, visitLastTime: {gte: moment().startOf('day').toDate()}});
    return {
      list: visit,
      todayCount: todayCount.count
    }
  }
}

import {repository} from '@loopback/repository';
import {get, HttpErrors, post, requestBody} from '@loopback/rest';
import {FlowerHistoryRepository, MeetingProfileRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {UserCredentials} from '../types';

export class FlowerController {
  constructor(
    @repository(FlowerHistoryRepository) public flowerHistoryRepository : FlowerHistoryRepository,
    @repository(UserRepository) public userRepository : UserRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {}

  @get('/flowers/histories')
  @secured(SecuredType.IS_AUTHENTICATED)
  async historyList() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const userInfo = await this.userRepository.findById(currentUser.userId);
    const flowerHistory = await this.flowerHistoryRepository.find({where: {flowerUserId: currentUser.userId}, order: ['createdAt desc']});
    return {
      userFlower: userInfo.userFlower,
      flowerHistory: flowerHistory.map((v) => ({content: v.flowerContent, value: v.flowerValue, createdAt: v.createdAt})),
    }
  }

  @post('/flowers/give')
  @secured(SecuredType.IS_AUTHENTICATED)
  async giveFlower(
    @requestBody() data: {otherUserId: string, flower: number}
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const [userInfo, userMeetingProfile, otherUserInfo, otherMeetingProfile] = await Promise.all([
      this.userRepository.findById(currentUser.userId),
      this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}, fields: ['id', 'meetingNickname']}),
      this.userRepository.findById(data.otherUserId),
      this.meetingProfileRepository.findOne({where: {userId: data.otherUserId}, fields: ['id', 'meetingNickname']})
    ]);

    if(data.flower > userInfo.userFlower) throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    await Promise.all([
      this.userRepository.updateById(currentUser.userId, {userFlower: userInfo.userFlower - data.flower}),
      this.userRepository.updateById(data.otherUserId, {userFlower: otherUserInfo.userFlower + data.flower}),
      this.flowerHistoryRepository.createAll([
        {flowerUserId: currentUser.userId, flowerContent: otherMeetingProfile?.meetingNickname + '님에게 선물함', flowerValue: -data.flower},
        {flowerUserId: data.otherUserId, flowerContent: userMeetingProfile?.meetingNickname + '님에게서 선물을 받음', flowerValue: data.flower},
      ])
    ]);
    return {userFlower: userInfo.userFlower - data.flower};
  }
}

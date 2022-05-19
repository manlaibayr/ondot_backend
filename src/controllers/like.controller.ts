import {repository} from '@loopback/repository';
import {HttpErrors, param, get, post} from '@loopback/rest';
import {FlowerHistoryRepository, LikeRepository, MeetingProfileRepository, UserRepository} from '../repositories';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {ServiceType, UserCredentials} from '../types';
import {secured, SecuredType} from '../role-authentication';

export class LikeController {
  constructor(
    @repository(LikeRepository) public likeRepository : LikeRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {}

  @get('/likes/add')
  @secured(SecuredType.IS_AUTHENTICATED)
  async create(
    @param.query.string('otherId') otherUserId: string
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const likeFlower = 1;
    const myInfo = await this.userRepository.findById(currentUser.userId);
    if(myInfo.userFlower < likeFlower) {
      throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    }
    const alreadyInfo = await this.likeRepository.findOne({where: {likeUserId: currentUser.userId,
        likeOtherUserId: otherUserId,
        likeServiceType: ServiceType.MEETING
    }});
    if(alreadyInfo) throw new HttpErrors.BadRequest('이미 좋아요 했습니다.');
    const otherUserMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: otherUserId}});
    await this.userRepository.updateById(currentUser.userId, {userFlower: myInfo.userFlower - likeFlower});
    await this.flowerHistoryRepository.create({
      flowerUserId: currentUser.userId,
      flowerContent: otherUserMeetingInfo?.meetingNickname + '님에게 좋아요함',
      flowerValue: -likeFlower,
    });
    return this.likeRepository.create({
      likeUserId: currentUser.userId,
      likeOtherUserId: otherUserId,
      likeServiceType: ServiceType.MEETING
    });
  }


}

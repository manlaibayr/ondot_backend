import {repository} from '@loopback/repository';
import {get, HttpErrors, post, requestBody} from '@loopback/rest';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import moment from 'moment';
import {RankingType, UserCredentials} from '../types';
import {secured, SecuredType} from '../role-authentication';
import {ChatContactRepository, LikeRepository, MeetingProfileRepository, RatingRepository, UserRepository} from '../repositories';

export class RatingController {
  constructor(
    @repository(RatingRepository) public ratingRepository: RatingRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(LikeRepository) public likeRepository: LikeRepository,
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @post('/ratings')
  @secured(SecuredType.IS_AUTHENTICATED)
  async giveRating(
    @requestBody() data: {otherUserId: string, ratingValue: 1 | 2 | 3 | 4 | 5}
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const already = await this.ratingRepository.findOne({where: {ratingUserId: currentUser.userId, ratingOtherUserId: data.otherUserId}});
    if(already) throw new HttpErrors.BadRequest('이미 별점을 주었습니다.');
    await this.ratingRepository.create({ratingUserId: currentUser.userId, ratingOtherUserId: data.otherUserId, ratingValue: data.ratingValue});
  }

  // @get('/ratings/summary')
  // @secured(SecuredType.IS_AUTHENTICATED)
  // async summaryRating() {
  //   const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
  //   const profileInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
  //   if(!profileInfo || moment(profileInfo.createdAt) > moment().subtract(14, 'days')) {
  //     return {needWait: true};
  //   } else {
  //     const myRatingList = await this.ratingRepository.find({where: {ratingOtherUserId: currentUser.userId}});
  //     const likeCount = await this.likeRepository.count({likeOtherUserId: currentUser.userId});
  //     const contactCount = await this.chatContactRepository.count({contactOtherUserId: currentUser.userId, createdAt: {gte: moment().startOf('month').toDate()}})
  //     const sumRating = myRatingList.reduce((sum: number, v) => sum + v.ratingValue, 0);
  //     return {
  //       averageRating: myRatingList.length === 0 ? 0 : sumRating / myRatingList.length,
  //       visitNumber: Math.min(32, 100),
  //       likeCount: Math.min(likeCount.count, 100),
  //       contactCount: Math.min(contactCount.count, 100),
  //       totalRating: Math.min(sumRating, 100),
  //     }
  //   }
  // }
}

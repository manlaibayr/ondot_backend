import {Filter, repository} from '@loopback/repository';
import {param, get, post, requestBody} from '@loopback/rest';
import {LearningReview} from '../models';
import {FlowerHistoryRepository, LearningProfileRepository, LearningReviewRepository, NotificationRepository, PointSettingRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {FlowerHistoryType, NotificationType, PointSettingType, ServiceType, UserCredentials} from '../types';
import {NotificationController} from './notification.controller';

export class LearningReviewController {
  constructor(
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(LearningReviewRepository) public learningReviewRepository : LearningReviewRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(LearningProfileRepository) public learningProfileRepository: LearningProfileRepository,
    @repository(PointSettingRepository) public pointSettingRepository: PointSettingRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @inject(`controllers.NotificationController`) private notificationController: NotificationController,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {}

  @get('/learning-reviews/list')
  @secured(SecuredType.IS_AUTHENTICATED)
  async find(
    @param.query.string('teacherUserId') teacherUserId: string
  ) {
    const reviewList = await this.learningReviewRepository.find({where: {reviewTeacherUserId: teacherUserId}, order: ['createdAt desc'], include: [{relation: 'studentProfile'}]});
    return reviewList.map((v) => ({
      id: v.id,
      reviewValue: v.reviewValue,
      reviewContent: v.reviewContent,
      createdAt: v.createdAt,
      studentNickname: v.reviewHideName ? '비공개' : v.studentProfile?.learningNickname
    }));
  }

  @post('/learning-reviews/give')
  @secured(SecuredType.IS_AUTHENTICATED)
  async giveReview(
    @requestBody() data: {teacherUserId: string, reviewValue: number, content?: string, hideName?: boolean}
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const myLearningProfile = await this.learningProfileRepository.findOne({where: {userId: currentUser.userId}});
    const teacherProfile = await this.learningProfileRepository.findOne({where: {userId: data.teacherUserId}});
    const reviewInfo = await this.learningReviewRepository.create({
      reviewStudentUserId: currentUser.userId,
      reviewTeacherUserId: data.teacherUserId,
      reviewValue: data.reviewValue,
      reviewContent: data.content,
      reviewHideName: data.hideName,
    });
    const pointSetting = await this.pointSettingRepository.findById(PointSettingType.POINT_LEARNING_REVIEW);
    const addFlower = pointSetting.pointSettingAmount;
    await this.userRepository.updateById(currentUser.userId, {freeFlower: currentUser.freeFlower + addFlower});
    await this.flowerHistoryRepository.create({
      flowerUserId: currentUser.userId, flowerContent: teacherProfile?.learningNickname + ' 선생님 후기작성 보상', flowerValue: addFlower, isFreeFlower: true,
      flowerHistoryType: FlowerHistoryType.TEACHER_REVIEW, flowerHistoryRefer: reviewInfo.id,
    });

    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: data.teacherUserId,
      notificationMsg: myLearningProfile?.learningNickname + '학생이 후기를 등록했어요.',
      notificationType: NotificationType.LEARNING_DIBS,
      notificationServiceType: ServiceType.LEARNING,
      notificationDesc: reviewInfo.id,
    });
    await this.notificationController.sendPushNotification(data.teacherUserId, myLearningProfile?.learningNickname + '님', myLearningProfile?.learningNickname + '학생이 후기를 등록했어요.');
    return {flower: addFlower};
  }
}

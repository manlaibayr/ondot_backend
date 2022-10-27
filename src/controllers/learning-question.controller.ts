import {repository} from '@loopback/repository';
import {post, get, getModelSchemaRef, requestBody, response, param} from '@loopback/rest';
import {LearningQuestion, LearningQuestionWithRelations} from '../models';
import {FlowerHistoryRepository, LearningQuestionCommentRepository, LearningQuestionCommentThumbRepository, LearningQuestionRepository, PointSettingRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {FlowerHistoryType, PointSettingType, UserCredentials} from '../types';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {LearningProfileController} from './learning-profile.controller';
import {Utils} from '../utils';

export class LearningQuestionController {
  constructor(
    @repository(LearningQuestionRepository) public learningQuestionRepository: LearningQuestionRepository,
    @repository(LearningQuestionCommentRepository) public learningQuestionCommentRepository: LearningQuestionCommentRepository,
    @repository(LearningQuestionCommentThumbRepository) public learningQuestionCommentThumbRepository: LearningQuestionCommentThumbRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(PointSettingRepository) public pointSettingRepository: PointSettingRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @post('/learning-questions')
  @secured(SecuredType.IS_AUTHENTICATED)
  async create(
    @requestBody() data: {title: string, content: string},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return this.learningQuestionRepository.create({questionUserId: currentUser.userId, questionTitle: data.title, questionContent: data.content, questionCommentCount: 0});
  }

  @get('/learning-questions/{id}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async info(
    @param.path.string('id') id: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const info: LearningQuestionWithRelations = await this.learningQuestionRepository.findById(id, {
      include: [
        {relation: 'questionUserProfile', scope: {fields: ['id', 'learningNickname']}},
        {relation: 'questionComments', scope: {include: [{relation: 'commentUserProfile', scope: {fields: ['id', 'learningNickname']}}]}},
      ],
    });
    info.questionUserProfile!.tchProfileMainPhoto = LearningProfileController.getStudentProfile(info.questionUserProfile);
    info.questionComments?.forEach((v) => {
      v.commentUserProfile!.tchProfileMainPhoto = LearningProfileController.getStudentProfile(v.commentUserProfile);
    });

    const rootComments: any[] = info.questionComments?.filter((v) => !v.commentParentId) || [];
    info.questionComments?.filter((v) => !!v.commentParentId).forEach((v) => {
      const i = rootComments.findIndex((vv) => vv.id === v.commentParentId);
      if(i !== -1) {
        if(!rootComments[i].child) rootComments[i].child = [];
        rootComments[i].child.push(v);
      }
    });
    info.questionComments = [];
    rootComments.forEach((v) => {
      info.questionComments?.push(v);
      v.child?.forEach((vv: any) => {
        info.questionComments?.push(vv);
      })
    });
    return info;
  }

  @get('/learning-questions/list')
  @secured(SecuredType.IS_AUTHENTICATED)
  async list() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return this.learningQuestionRepository.find({
      // where: {questionUserId: currentUser.userId},
      order: ['createdAt desc'],
      include: [{relation: 'questionUserProfile', scope: {fields: ['id', 'learningNickname']}}],
    });
  }

  @post('/learning-questions/comment')
  @secured(SecuredType.IS_AUTHENTICATED)
  async addComment(
    @requestBody() data: {questionId: string, parentCommentId?: string, content: string},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const questionInfo = await this.learningQuestionRepository.findById(data.questionId);
    const pointSetting = await this.pointSettingRepository.findById(PointSettingType.POINT_LEARNING_COMMENT);
    const commentFlower = pointSetting.pointSettingAmount;

    const commentInfo = await this.learningQuestionCommentRepository.create({
      commentUserId: currentUser.userId,
      commentQuestionId: data.questionId,
      commentParentId: data.parentCommentId,
      commentContent: data.content,
      commentThumbCount: 0,
    });
    await this.userRepository.updateById(currentUser.userId, {freeFlower: currentUser.freeFlower + commentFlower});
    await this.flowerHistoryRepository.create({
      flowerUserId: currentUser.userId,
      flowerContent: questionInfo.questionTitle + '질문에 답변작성',
      flowerValue: commentFlower,
      isFreeFlower: true,
      flowerHistoryType: FlowerHistoryType.QUESTION_COMMENT,
      flowerHistoryRefer: commentInfo.id,
    });
    const commentCount = await this.learningQuestionCommentRepository.count({commentQuestionId: data.questionId});
    await this.learningQuestionRepository.updateById(data.questionId, {questionCommentCount: commentCount.count});
  }

  @get('/learning-questions/comment/{id}/thumb')
  @secured(SecuredType.IS_AUTHENTICATED)
  async addCommentThumb(
    @param.path.string('id') id: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const thumbInfo = await this.learningQuestionCommentThumbRepository.findOne({where: {thumbCommentId: id, thumbUserId: currentUser.userId}});
    if (!thumbInfo) {
      await this.learningQuestionCommentThumbRepository.create({thumbCommentId: id, thumbUserId: currentUser.userId});
    } else {
      await this.learningQuestionCommentThumbRepository.deleteById(thumbInfo.id);
    }
    const count = await this.learningQuestionCommentThumbRepository.count({thumbCommentId: id});
    await this.learningQuestionCommentRepository.updateById(id, {commentThumbCount: count.count});
  }


}

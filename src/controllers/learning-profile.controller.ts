import {repository} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, param, post, Request, requestBody, Response, response, RestBindings} from '@loopback/rest';
import {LearningProfileRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {LearningProfile, MeetingProfile} from '../models';
import {FileUploadHandler, UserCredentials} from '../types';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {FILE_UPLOAD_SERVICE} from '../keys';
import moment from 'moment/moment';
import {Utils} from '../utils';

export class LearningProfileController {
  constructor(
    @repository(LearningProfileRepository) public learningProfileRepository: LearningProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(FILE_UPLOAD_SERVICE) private fileUploadHandler: FileUploadHandler,
  ) {
  }


  @get('/learning-profiles/check-nickname')
  @secured(SecuredType.IS_AUTHENTICATED)
  async checkNickname(
    @param.query.string('nickname') nickname: string,
  ) {
    const profileInfo = await this.learningProfileRepository.findOne({where: {learningNickname: nickname}});
    return {exist: !!profileInfo};
  }

  @post('/learning-profiles')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(200, {
    description: 'LearningProfile model instance',
    content: {'application/json': {schema: getModelSchemaRef(LearningProfile)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(LearningProfile, {
            title: 'NewLearningProfile',
            exclude: ['id', 'userId'],
          }),
        },
      },
    })
      learningProfile: Omit<LearningProfile, 'id'>,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const profileInfo = await this.learningProfileRepository.findOne({where: {userId: currentUser.userId}});
    if (profileInfo) {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
    const userInfo = await this.userRepository.findById(currentUser.userId);
    learningProfile.userId = currentUser.userId;
    learningProfile.age = userInfo.age;
    learningProfile.sex = userInfo.sex ? '남성' : '여성';
    const profileResult = await this.learningProfileRepository.create(learningProfile);
    await this.userRepository.updateById(currentUser.userId, {learningProfileId: profileResult.id});
  }

  @post('/learning-profiles/upload-file')
  @secured(SecuredType.IS_AUTHENTICATED)
  async uploadFile(
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) resp: Response,
  ) {
    const uploadPath: string = 'profile-learning/' + moment().format('YYYYMM');
    const uploadFiles = await new Promise<any[]>((resolve, reject) => {
      this.fileUploadHandler(request, resp, (err: unknown) => {
        if (err) reject(err);
        else {
          resolve(Utils.getFilesAndFields(request, uploadPath));
        }
      });
    });
    return uploadFiles.map((v) => v.urlPath).join(',');
  }

}

import {get, getModelSchemaRef, HttpErrors, param, patch, post, Request, requestBody, Response, response, RestBindings} from '@loopback/rest';
import {Count, CountSchema, repository} from '@loopback/repository';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import moment from 'moment';
import {secured, SecuredType} from '../role-authentication';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {FileUploadHandler, UserCredentials} from '../types';
import {Utils} from '../utils';
import {HobbyProfile} from '../models';
import { HobbyProfileRepository, UserRepository, } from '../repositories';

export class HobbyProfileController {
  constructor(
    @repository(HobbyProfileRepository) public hobbyProfileRepository: HobbyProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(FILE_UPLOAD_SERVICE) private fileUploadHandler: FileUploadHandler,
  ) {
  }

  @get('/hobby-profiles/check-nickname')
  @secured(SecuredType.IS_AUTHENTICATED)
  async checkNickname(
    @param.query.string('nickname') nickname: string,
  ) {
    const profileInfo = await this.hobbyProfileRepository.findOne({where: {hobbyNickname: nickname}});
    return {exist: !!profileInfo};
  }

  @post('/hobby-profiles')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(200, {
    description: 'HobbyProfile model instance',
    content: {'application/json': {schema: getModelSchemaRef(HobbyProfile)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(HobbyProfile, {
            title: 'NewHobbyProfile',
            exclude: ['id', 'userId'],
          }),
        },
      },
    })
      hobbyProfile: Omit<HobbyProfile, 'id'>,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const profileInfo = await this.hobbyProfileRepository.findOne({where: {userId: currentUser.userId}});
    if (profileInfo) {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
    const userInfo = await this.userRepository.findById(currentUser.userId);
    hobbyProfile.userId = currentUser.userId;
    hobbyProfile.age = userInfo.age;
    hobbyProfile.sex = userInfo.sex ? '남성' : '여성';
    if(!hobbyProfile.hobbyPhoto) {
      hobbyProfile.hobbyPhoto = 'profile-hobby/default_profile.png';
    }
    const profileResult = await this.hobbyProfileRepository.create(hobbyProfile);
    await this.userRepository.updateById(currentUser.userId, {hobbyProfileId: profileResult.id});
  }

  @patch('/hobby-profiles')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(200, {
    description: 'HobbyProfile PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(HobbyProfile, {partial: true}),
        },
      },
    })
      hobbyProfile: Omit<HobbyProfile, 'id' | 'age' | 'sex'>,
  ): Promise<Count> {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return this.hobbyProfileRepository.updateAll(hobbyProfile, {userId: currentUser.userId});
  }

  @post('/hobby-profiles/upload-file')
  @secured(SecuredType.IS_AUTHENTICATED)
  async uploadFile(
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) resp: Response,
  ) {
    const uploadPath: string = 'profile-hobby/' + moment().format('YYYYMM');
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

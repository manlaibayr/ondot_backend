import {Count, CountSchema, Filter, repository} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, param, patch, post, Request, requestBody, response, Response, RestBindings} from '@loopback/rest';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import moment from 'moment';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {FileUploadHandler, ServiceType, UserCredentials} from '../types';
import {MeetingProfile} from '../models';
import {ChatContactRepository, LikeRepository, MeetingProfileRepository, RatingRepository, UserRepository, VisitRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {Utils} from '../utils';

export class MeetingProfileController {
  constructor(
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(LikeRepository) public likeRepository : LikeRepository,
    @repository(ChatContactRepository) public meetingChatListRepository: ChatContactRepository,
    @repository(RatingRepository) public ratingRepository: RatingRepository,
    @repository(VisitRepository) public visitRepository: VisitRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(FILE_UPLOAD_SERVICE) private fileUploadHandler: FileUploadHandler,
  ) {
  }

  @get('/meeting-profiles')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(200, {
    description: 'Array of MeetingProfile model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(MeetingProfile, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(MeetingProfile) filter?: Filter<MeetingProfile>,
  ){
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const likeCount = await this.likeRepository.count({likeOtherUserId: currentUser.userId});
    const profile = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    if(!profile) throw new HttpErrors.BadRequest('미팅 프로파일을 설정해야 합니다.');
    const data: any = profile.toJSON();
    data.likeCount = likeCount.count;
    return data;
  }

  @get('/meeting-profiles/check-nickname')
  @secured(SecuredType.IS_AUTHENTICATED)
  async checkNickname(
    @param.query.string('nickname') nickname: string,
  ) {
    const profileInfo = await this.meetingProfileRepository.findOne({where: {meetingNickname: nickname}});
    return {exist: !!profileInfo};
  }

  @post('/meeting-profiles')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(200, {
    description: 'MeetingProfile model instance',
    content: {'application/json': {schema: getModelSchemaRef(MeetingProfile)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(MeetingProfile, {
            title: 'NewMeetingProfile',
            exclude: ['id', 'userId'],
          }),
        },
      },
    })
      meetingProfile: Omit<MeetingProfile, 'id'>,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const profileInfo = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    if (profileInfo) {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
    const userInfo = await this.userRepository.findById(currentUser.userId);
    meetingProfile.userId = currentUser.userId;
    meetingProfile.age = userInfo.age;
    meetingProfile.sex = userInfo.sex ? '남성' : '여성';
    const profileResult = await this.meetingProfileRepository.create(meetingProfile);
    await this.userRepository.updateById(currentUser.userId, {meetingProfileId: profileResult.id});
  }

  @patch('/meeting-profiles')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(200, {
    description: 'MeetingProfile PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(MeetingProfile, {partial: true}),
        },
      },
    })
      meetingProfile: Omit<MeetingProfile, 'id' | 'age' | 'sex'>,
  ): Promise<Count> {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return this.meetingProfileRepository.updateAll(meetingProfile, {userId: currentUser.userId});
  }

  @post('/meeting-profiles/upload-img')
  @secured(SecuredType.IS_AUTHENTICATED)
  async uploadImage(
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) resp: Response,
  ) {
    const uploadPath: string = 'profile-meeting/' + moment().format('YYYYMM');
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

  @get('/meeting-profiles/other/{id}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async otherInfo(
    @param.path.string('id') id: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const otherProfile = await this.meetingProfileRepository.findById(id);
    const likeInfo = await this.likeRepository.findOne({where: {likeUserId: currentUser.userId, likeOtherUserId: otherProfile.userId, likeServiceType: ServiceType.MEETING}});
    const meetingChatList = await this.meetingChatListRepository.findOne(
      {where: {or: [{contactUserId: currentUser.userId, contactOtherUserId: otherProfile.userId}, {contactUserId: otherProfile.userId, contactOtherUserId: currentUser.userId}]}}
    )
    const ratingCount = await this.ratingRepository.count({ratingUserId: currentUser.userId, ratingOtherUserId: otherProfile.userId});
    const data: any = otherProfile.toJSON();
    data.isLike = !!likeInfo;
    data.isChat = !!meetingChatList;
    data.isGiveRating = ratingCount.count > 0;
    const visitInfo = await this.visitRepository.findOne({where: {visitUserId: currentUser.userId, visitOtherUserId: otherProfile.userId, visitServiceType: ServiceType.MEETING}});
    if(visitInfo) {
      await this.visitRepository.updateById(visitInfo.id, {visitLastTime: new Date()});
    } else {
      await this.visitRepository.create({visitUserId: currentUser.userId, visitOtherUserId: otherProfile.userId, visitServiceType: ServiceType.MEETING, visitLastTime: new Date()});
    }
    return data;
  }
}

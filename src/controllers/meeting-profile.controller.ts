import {Count, CountSchema, Filter, repository} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, param, patch, post, Request, requestBody, response, Response, RestBindings} from '@loopback/rest';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import moment from 'moment';
import axios from 'axios';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {ContactStatus, FileUploadHandler, FlowerHistoryType, PointSettingType, ServiceType, UserCredentials} from '../types';
import {MeetingProfile} from '../models';
import {
  BlockPhoneRepository,
  BlockUserRepository,
  ChatContactRepository,
  FlowerHistoryRepository,
  LikeRepository,
  MeetingProfileRepository,
  PointSettingRepository,
  RatingRepository,
  UsagePassRepository,
  UserRepository,
  VisitRepository,
} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {Utils} from '../utils';
import {FlowerController} from './flower.controller';
import {RankingUserController} from './ranking-user.controller';
import {CONFIG} from '../config';

export class MeetingProfileController {
  constructor(
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(LikeRepository) public likeRepository: LikeRepository,
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @repository(RatingRepository) public ratingRepository: RatingRepository,
    @repository(VisitRepository) public visitRepository: VisitRepository,
    @repository(BlockUserRepository) public blockUserRepository: BlockUserRepository,
    @repository(BlockPhoneRepository) public blockPhoneRepository: BlockPhoneRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(UsagePassRepository) public usagePassRepository: UsagePassRepository,
    @repository(PointSettingRepository) public pointSettingRepository: PointSettingRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(FILE_UPLOAD_SERVICE) private fileUploadHandler: FileUploadHandler,
    @inject(`controllers.FlowerController`) private flowerController: FlowerController,
    @inject(`controllers.RankingUserController`) private rankingUserController: RankingUserController,
  ) {
  }

  async getCoordinates(address: string) {
    const url = 'https://dapi.kakao.com/v2/local/search/address.json?query=' + encodeURIComponent(address);
    axios.defaults.withCredentials = false;
    axios.defaults.headers.common['Authorization'] = 'KakaoAK ' + 'xxxxxxxxxxxxxxxxxxxxxxx';
    axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
    const resp = await axios.get(url, {headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'KakaoAK ' + CONFIG.kakaoRestApiKey}});
    if(resp.data.documents.length > 0) {
      return {lat: resp.data.documents[0].y, lng: resp.data.documents[0].x};
    } else {
      return {lat: 0, lng: 0};
    }
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
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const likeCount = await this.likeRepository.count({likeOtherUserId: currentUser.userId});
    const visitCount = await this.visitRepository.count({visitOtherUserId: currentUser.userId, visitLastTime: {gte: moment().startOf('day').toDate()}});
    const profile = await this.meetingProfileRepository.findOne({where: {userId: currentUser.userId}});
    if (!profile) throw new HttpErrors.BadRequest('미팅 프로파일을 설정해야 합니다.');
    const data: any = profile.toJSON();
    data.likeCount = likeCount.count;
    data.visitCount = visitCount.count;
    data.totalFavor = await this.rankingUserController.calcUserMeetingTotalFavor(currentUser.userId);
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
    let freeFlower = currentUser.freeFlower;
    if (meetingProfile.meetingPhotoAdditional && meetingProfile.meetingPhotoAdditional.split(',').length >= 4) {
      const pointSetting = await this.pointSettingRepository.findById(PointSettingType.POINT_MEETING_PROFILE);
      const additionalFlower = pointSetting.pointSettingAmount;

      await this.flowerHistoryRepository.create({
        flowerUserId: currentUser.userId,
        flowerContent: '미팅프로필 등록시 사진 4장을 추가하여 받음',
        flowerValue: additionalFlower,
        isFreeFlower: true,
        flowerHistoryType: FlowerHistoryType.NORMAL
      });
      freeFlower += additionalFlower;
    }
    if(meetingProfile.meetingResidence) {
      const {lat, lng} = await this.getCoordinates(meetingProfile.meetingResidence);
      meetingProfile.meetingResidenceLat = lat;
      meetingProfile.meetingResidenceLng = lng;
    }
    const profileResult = await this.meetingProfileRepository.create(meetingProfile);
    await this.userRepository.updateById(currentUser.userId, {meetingProfileId: profileResult.id, freeFlower});
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
    if(meetingProfile.meetingResidence) {
      const {lat, lng} = await this.getCoordinates(meetingProfile.meetingResidence);
      meetingProfile.meetingResidenceLat = lat;
      meetingProfile.meetingResidenceLng = lng;
    }
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return this.meetingProfileRepository.updateAll(meetingProfile, {userId: currentUser.userId});
  }

  @post('/meeting-profiles/upload-file')
  @secured(SecuredType.IS_AUTHENTICATED)
  async uploadFile(
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
    let otherProfile = await this.meetingProfileRepository.findOne({where: {userId: id}});
    if (!otherProfile) otherProfile = await this.meetingProfileRepository.findById(id);
    const likeInfo = await this.likeRepository.findOne({where: {likeUserId: currentUser.userId, likeOtherUserId: otherProfile.userId, likeServiceType: ServiceType.MEETING}});
    const meetingChatInfo = await this.chatContactRepository.findOne(
      {
        where: {
          or: [{contactUserId: currentUser.userId, contactOtherUserId: otherProfile.userId}, {contactUserId: otherProfile.userId, contactOtherUserId: currentUser.userId}],
          contactServiceType: ServiceType.MEETING,
        },
      },
    );
    const isAvailableContactReq = !meetingChatInfo || (meetingChatInfo?.contactStatus !== ContactStatus.ALLOW && meetingChatInfo?.contactStatus !== ContactStatus.REQUEST && meetingChatInfo?.contactRequestNumber < 2);
    const ratingCount = await this.ratingRepository.count({ratingUserId: currentUser.userId, ratingOtherUserId: otherProfile.userId});
    const blockInfo = await this.blockUserRepository.findOne({where: {blockUserId: currentUser.userId, blockOtherUserId: otherProfile.userId, blockServiceType: ServiceType.MEETING}});
    const data: any = otherProfile.toJSON();
    data.meetingResidence = data.meetingResidence.split(' ').slice(0, 2).join(' ');
    data.isLike = !!likeInfo;
    data.isChat = !isAvailableContactReq;
    data.isGiveRating = ratingCount.count > 0;
    data.isBlock = !!blockInfo;
    data.totalFavor = await this.rankingUserController.calcUserMeetingTotalFavor(otherProfile.userId);
    if (otherProfile.meetingJobHide) {
      data.meetingJob = '비공개';
    }
    data.hasMeetingPass = await this.flowerController.hasUsagePass(currentUser.userId, ServiceType.MEETING);
    const visitInfo = await this.visitRepository.findOne({where: {visitUserId: currentUser.userId, visitOtherUserId: otherProfile.userId, visitServiceType: ServiceType.MEETING}});
    if (visitInfo) {
      await this.visitRepository.updateById(visitInfo.id, {visitLastTime: new Date()});
    } else {
      await this.visitRepository.create({visitUserId: currentUser.userId, visitOtherUserId: otherProfile.userId, visitServiceType: ServiceType.MEETING, visitLastTime: new Date()});
    }
    return data;
  }
}

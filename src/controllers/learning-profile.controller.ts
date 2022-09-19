import {Count, CountSchema, repository} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, param, patch, post, Request, requestBody, Response, response, RestBindings} from '@loopback/rest';
import {ChatContactRepository, FlowerHistoryRepository, LearningDibsRepository, LearningProfileRepository, NotificationRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {LearningProfile} from '../models';
import {ChatType, ContactStatus, FileUploadHandler, FlowerHistoryType, LearningProfileType, MainSocketMsgType, NotificationType, ServiceType, UserCredentials} from '../types';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {FILE_UPLOAD_SERVICE} from '../keys';
import moment from 'moment/moment';
import {Utils} from '../utils';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Namespace, Server} from 'socket.io';
import {FlowerController} from './flower.controller';

export class LearningProfileController {
  constructor(
    @repository(LearningProfileRepository) public learningProfileRepository: LearningProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(LearningDibsRepository) public learningDibsRepository: LearningDibsRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(FILE_UPLOAD_SERVICE) private fileUploadHandler: FileUploadHandler,
    @inject(`controllers.FlowerController`) private flowerController: FlowerController
  ) {
  }

  @get('/learning-profiles/main')
  @secured(SecuredType.IS_AUTHENTICATED)
  async learningMain(
    @ws.namespace('main') nspMain: Namespace,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const learningProfile = await this.learningProfileRepository.findOne({where: {userId: currentUser.userId}});
    if (learningProfile?.learningProfileType === LearningProfileType.STUDENT) {   // 학생일때
      const profileList = await this.learningProfileRepository.find({where: {learningProfileType: LearningProfileType.TEACHER}});// 접속한 회원 리스트
      const rooms: any = nspMain.adapter.rooms;
      const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');
      profileList.forEach((v: any) => {
        v.isOnline = onlineUserIds.indexOf(v.userId) !== -1;
      });

      return {
        learningProfile,
        popularList: profileList.slice(0, 5),
        nearList: profileList.slice(6, 15),
        matchList: profileList.slice(16, 25),
      };
    } else if (learningProfile?.learningProfileType === LearningProfileType.TEACHER) {   // 선생일때
      const profileList = await this.learningProfileRepository.find({where: {learningProfileType: LearningProfileType.STUDENT}});
    }
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

  @get('/learning-profiles')
  @secured(SecuredType.IS_AUTHENTICATED)
  async learningProfileInfo() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const learningProfile = await this.learningProfileRepository.findOne({where: {userId: currentUser.userId}});
    return learningProfile;
  }

  @patch('/learning-profiles')
  @secured(SecuredType.IS_AUTHENTICATED)
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(LearningProfile, {partial: true}),
        },
      },
    })
      learningProfile: Omit<LearningProfile, 'id' | 'age' | 'sex'>,
  ): Promise<Count> {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return this.learningProfileRepository.updateAll(learningProfile, {userId: currentUser.userId});
  }

  @get('/learning-profiles/other/{id}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async otherInfo(
    @param.path.string('id') id: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    let otherProfile = await this.learningProfileRepository.findOne({where: {userId: id}});
    if (!otherProfile) otherProfile = await this.learningProfileRepository.findById(id);
    const dibInfo = await this.learningDibsRepository.findOne({where: {dibsUserId: currentUser.userId, dibsTargetUserId: otherProfile.userId}});
    const data: any = otherProfile.toJSON();
    const learningChatList = await this.chatContactRepository.findOne(
      {
        where: {
          or: [{contactUserId: currentUser.userId, contactOtherUserId: otherProfile.userId}, {contactUserId: otherProfile.userId, contactOtherUserId: currentUser.userId}],
          contactServiceType: ServiceType.LEARNING,
        },
      },
    );
    data.isDibs = !!dibInfo;
    data.hasLearningPass = await this.flowerController.hasUsagePass(currentUser.userId, ServiceType.LEARNING);
    data.isChat = !!learningChatList;
    return data;
  }

  @get('/learning-profiles/dibs')
  @secured(SecuredType.IS_AUTHENTICATED)
  async changeDibs(
    @param.query.string('id') teacherId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const myLearningProfile = await this.learningProfileRepository.findOne({where: {userId: currentUser.userId}});
    const teacherProfile = await this.learningProfileRepository.findById(teacherId);
    if (!myLearningProfile || myLearningProfile.learningProfileType !== LearningProfileType.STUDENT || !teacherProfile || teacherProfile.learningProfileType !== LearningProfileType.TEACHER) {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
    const dibsInfo = await this.learningDibsRepository.findOne({where: {dibsUserId: currentUser.userId, dibsTargetUserId: teacherProfile.userId}});
    if(!dibsInfo) {
      await this.learningDibsRepository.create({dibsUserId: currentUser.userId, dibsTargetUserId: teacherProfile.userId});
    } else {
      await this.learningDibsRepository.deleteById(dibsInfo.id);
    }
  }


  @get('/learning-profiles/request-chat')
  @secured(SecuredType.IS_AUTHENTICATED)
  async learningRequestChat(
    @ws.namespace('main') nspMain: Server,
    @param.query.string('userId') userId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const myLearningInfo = await this.learningProfileRepository.findOne({where: {userId: currentUser.userId}});
    const otherUserLearningInfo = await this.learningProfileRepository.findOne({where: {userId: userId}});
    let chatContactInfo = await this.chatContactRepository.findOne({
      where: {
        or: [
          {contactUserId: currentUser.userId, contactOtherUserId: userId, contactServiceType: ServiceType.LEARNING},
          {contactUserId: userId, contactOtherUserId: currentUser.userId, contactServiceType: ServiceType.LEARNING}
        ],
      },
    });
    if (!chatContactInfo) {
      chatContactInfo = await this.chatContactRepository.create({
        contactUserId: currentUser.userId,
        contactOtherUserId: userId,
        contactStatus: ContactStatus.REQUEST,
        contactOtherStatus: ContactStatus.REQUESTED,
        contactServiceType: ServiceType.LEARNING
      });
    }

    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: userId,
      notificationMsg: myLearningInfo?.learningNickname + '님이 대화신청을 보냈습니다.',
      notificationType: NotificationType.CHAT_REQUEST,
      notificationServiceType: ServiceType.LEARNING,
    });

    nspMain.to(userId).emit(MainSocketMsgType.SRV_REQUEST_CHAT, {
      callUserId: currentUser.userId,
      callUserName: myLearningInfo?.learningNickname,
      callUserProfile: myLearningInfo?.learningNickname,
      contactId: chatContactInfo.id,
      chatType: ChatType.HOBBY_CHAT
    });
  }

}

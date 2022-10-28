import {Count, repository} from '@loopback/repository';
import {get, getModelSchemaRef, HttpErrors, param, patch, post, Request, requestBody, Response, response, RestBindings} from '@loopback/rest';
import {
  BlockUserRepository,
  ChatContactRepository,
  FlowerHistoryRepository,
  LearningDibsRepository,
  LearningProfileRepository,
  NotificationRepository,
  UsagePassRepository,
  UserRepository,
} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {LearningProfile} from '../models';
import {ChatType, ContactStatus, FileUploadHandler, LearningProfileType, MainSocketMsgType, NotificationType, ServiceType, UserCredentials} from '../types';
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
    @repository(BlockUserRepository) public blockUserRepository: BlockUserRepository,
    @repository(UsagePassRepository) public usagePassRepository: UsagePassRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
    @inject(FILE_UPLOAD_SERVICE) private fileUploadHandler: FileUploadHandler,
    @inject(`controllers.FlowerController`) private flowerController: FlowerController,
  ) {
  }

  getStudentMatchCount(
    tchProfile: LearningProfile,
    stuProfile: LearningProfile,
  ): number {
    let matchCount = 0;
    if(stuProfile.stuPreferSex === tchProfile.sex) matchCount++;
    if(stuProfile.stuStatus?.split(' ')[0] && tchProfile.tchAvailableAge?.indexOf(stuProfile.stuStatus?.split(' ')[0]) !== -1) matchCount++;
    // 과목비교
    const studentSubjects = stuProfile.stuSubject?.split(',') || [];
    if((tchProfile.tchSubject?.split(',') || []).some((v) => studentSubjects.indexOf(v) !== -1)) matchCount++;
    if(stuProfile.stuPreferLesson === tchProfile.stuPreferLesson) matchCount++;
    // 요일비교
    const studentPossibleDay = stuProfile.stuPossibleDay?.split(',') || [];
    if((tchProfile.tchPossibleDay?.split(',') || []).some((v) => studentPossibleDay.indexOf(v) !== -1)) matchCount++;
    // 시간비교
    const stuPossibleTime: any = JSON.parse(stuProfile.stuPossibleTime || '{}');
    const tchPossibleTime: any = JSON.parse(tchProfile.tchPossibleTime || '{}');
    if(stuPossibleTime.start > tchPossibleTime.start && stuPossibleTime.end < tchPossibleTime) matchCount++
    return matchCount;
  }

  getTeacherMatchCount(
    tchProfile: LearningProfile,
    stuProfile: LearningProfile,
  ): number {
    let matchCount = 0;
    if(stuProfile.stuPreferSex === tchProfile.sex) matchCount++;
    if(stuProfile.stuStatus?.split(' ')[0] && tchProfile.tchAvailableAge?.indexOf(stuProfile.stuStatus?.split(' ')[0]) !== -1) matchCount++;
    // 과목비교
    const studentSubjects = stuProfile.stuSubject?.split(',') || [];
    if((tchProfile.tchSubject?.split(',') || []).some((v) => studentSubjects.indexOf(v) !== -1)) matchCount++;
    if(stuProfile.stuPreferLesson === tchProfile.stuPreferLesson) matchCount++;
    // 요일비교
    const studentPossibleDay = stuProfile.stuPossibleDay?.split(',') || [];
    if((tchProfile.tchPossibleDay?.split(',') || []).some((v) => studentPossibleDay.indexOf(v) !== -1)) matchCount++;
    // 시간비교
    const stuPossibleTime: any = JSON.parse(stuProfile.stuPossibleTime || '{}');
    const tchPossibleTime: any = JSON.parse(tchProfile.tchPossibleTime || '{}');
    if(stuPossibleTime.start > tchPossibleTime.start && stuPossibleTime.end < tchPossibleTime) matchCount++
    return matchCount;
  }

  public static getStudentProfile(profile: LearningProfile | undefined): string | undefined {
    if (!profile) return '';
    if (profile.learningProfileType === LearningProfileType.TEACHER) {
      return profile.tchProfileMainPhoto;
    } else {
      let imgName;
      if (!profile.stuStatus) {
        imgName = 'normal';
      } else if (profile.stuStatus.indexOf('7세이하') === 0) {
        imgName = 'under7';
      } else if (profile.stuStatus.indexOf('일반') === 0) {
        imgName = 'normal';
      } else {
        imgName = 'middle';
      }
      if (profile.sex === '남성') {
        imgName += '_man';
      } else {
        imgName += '_woman';
      }
      return `profile-learning/student/${imgName}.png`;
    }
  }

  @get('/learning-profiles/main')
  @secured(SecuredType.IS_AUTHENTICATED)
  async learningMain(
    @ws.namespace('main') nspMain: Namespace,
    @param.query.string('type') type: string,
    @param.query.string('param') param?: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const learningProfile = await this.learningProfileRepository.findOne({where: {userId: currentUser.userId}});
    const rooms: any = nspMain.adapter.rooms;
    const onlineUserIds = Object.keys(rooms).filter((v) => v[0] !== '/');
    const allData: any = {};
    if (learningProfile?.learningProfileType === LearningProfileType.STUDENT) {   // 학생일때
      const profileList = await this.learningProfileRepository.find({where: {learningProfileType: LearningProfileType.TEACHER}, order: ['learningRanking desc']});// 접속한 회원 리스트
      profileList.forEach((v: any) => {
        v.isOnline = onlineUserIds.indexOf(v.userId) !== -1;
      });
      if (type === 'all' || type === 'ranking') {
        if(type !== 'all')  {
          return profileList.slice(0, 7);
        } else {
          allData.popularList = profileList.slice(0, 7);
        }
      }
      if (type === 'subject') {
        if (param === 'null') param = '';  // 과목이 전체인경우
        const listForSubject = await this.learningProfileRepository.find({where: {learningProfileType: LearningProfileType.TEACHER, tchSubject: {like: `%${param}%`}}});// 접속한 회원 리스트
        listForSubject.forEach((v: any) => {
          v.isOnline = onlineUserIds.indexOf(v.userId) !== -1;
        });
      }
      if (type === 'all' || type === 'region') {
        const region: any[] = learningProfile.learningPossibleResidence?.split(',') || [];
        const listForSubject = await this.learningProfileRepository.find({
          where: {
            id: {neq: learningProfile.id},
            learningProfileType: LearningProfileType.TEACHER,
            or: region.map((v) => ({learningPossibleResidence: {like: `%${v}%`}}))
          },
        });// 접속한 회원 리스트
        listForSubject.forEach((v: any) => {
          v.isOnline = onlineUserIds.indexOf(v.userId) !== -1;
        });
        if(type !== 'all')  {
          return listForSubject.slice(0, 30);
        } else {
          allData.nearList = listForSubject.slice(0, 30);
        }
      }
      if (type === 'all' || type === 'matching') {
        profileList.sort((a: any, b: any) => {
          return (this.getStudentMatchCount(learningProfile, b) - this.getStudentMatchCount(learningProfile, a));
        });
        if(type !== 'all')  {
          return profileList.slice(0, 30);
        } else {
          allData.matchList = profileList.slice(0, 30);
        }
      }

      if (type === 'all') {
        return {
          learningProfile,
          ...allData,
        };
      }
    } else if (learningProfile?.learningProfileType === LearningProfileType.TEACHER) {   // 선생일때
      const profileList = await this.learningProfileRepository.find({where: {learningProfileType: LearningProfileType.STUDENT}, order: ['learningRanking desc']});
      profileList.forEach((v: any) => {
        v.isOnline = onlineUserIds.indexOf(v.userId) !== -1;
        v.tchProfileMainPhoto = LearningProfileController.getStudentProfile(v);
      });
      if (type === 'subject') {
        if (param === 'null') param = '';  // 과목이 전체인경우
        const listForSubject = await this.learningProfileRepository.find({where: {learningProfileType: LearningProfileType.STUDENT, stuSubject: {like: `%${param}%`}}});// 접속한 회원 리스트
        listForSubject.forEach((v: any) => {
          v.isOnline = onlineUserIds.indexOf(v.userId) !== -1;
        });
        return listForSubject.slice(0, 15);
      }
      if (type === 'all' || type === 'region') {
        const region: any[] = learningProfile.learningPossibleResidence?.split(',') || [];
        const listForSubject = await this.learningProfileRepository.find({
          where: {
            id: {neq: learningProfile.id},
            learningProfileType: LearningProfileType.TEACHER,
            or: region.map((v) => ({learningPossibleResidence: {like: `%${v}%`}}))
          },
        });// 접속한 회원 리스트
        listForSubject.forEach((v: any) => {
          v.isOnline = onlineUserIds.indexOf(v.userId) !== -1;
        });
        if(type !== 'all')  {
          return listForSubject.slice(0, 15);
        } else {
          allData.nearList = listForSubject.slice(0, 15);
        }
      }
      if (type === 'all' || type === 'matching') {
        profileList.sort((a: any, b: any) => {
          return (this.getTeacherMatchCount(learningProfile, b) - this.getTeacherMatchCount(learningProfile, a));
        });
        if(type !== 'all')  {
          return profileList.slice(0, 15);
        } else {
          allData.matchList = profileList.slice(0, 15);
        }
      }
      return {
        learningProfile,
        ...allData,
      };
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
    if (learningProfile) {
      learningProfile.tchProfileMainPhoto = LearningProfileController.getStudentProfile(learningProfile);
    }
    const info: any = {...learningProfile};
    if (learningProfile?.learningProfileType === LearningProfileType.TEACHER) {
      const usagePassInfo = await this.usagePassRepository.find({
        where: {passUserId: currentUser.userId, passServiceType: ServiceType.LEARNING, passExpireDate: {gte: moment().toDate()}},
        order: ['passExpireDate desc'],
      });
      if (usagePassInfo.length > 0) info.passExpireDate = usagePassInfo[0].passExpireDate;
    }
    return info;
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
    otherProfile.tchProfileMainPhoto = LearningProfileController.getStudentProfile(otherProfile);
    const dibInfo = await this.learningDibsRepository.findOne({where: {dibsUserId: currentUser.userId, dibsTargetUserId: otherProfile.userId}});
    const blockInfo = await this.blockUserRepository.findOne({where: {blockUserId: currentUser.userId, blockOtherUserId: otherProfile.userId, blockServiceType: ServiceType.LEARNING}});
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
    data.isBlock = !!blockInfo;
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
    const targetProfile = await this.learningProfileRepository.findById(teacherId);
    const dibsInfo = await this.learningDibsRepository.findOne({where: {dibsUserId: currentUser.userId, dibsTargetUserId: targetProfile.userId}});
    if (!dibsInfo) {
      await this.learningDibsRepository.create({dibsUserId: currentUser.userId, dibsTargetUserId: targetProfile.userId});
    } else {
      await this.learningDibsRepository.deleteById(dibsInfo.id);
    }
  }

  @get('/learning-profiles/dibs-list')
  @secured(SecuredType.IS_AUTHENTICATED)
  async dibsList() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const giveList = await this.learningDibsRepository.find({
      where: {dibsUserId: currentUser.userId},
      include: [{relation: 'dibsTargetUserProfile'}],
    });
    const receiveList = await this.learningDibsRepository.find({
      where: {dibsTargetUserId: currentUser.userId},
      include: [{relation: 'dibsUserProfile'}],
    });
    const give = giveList.map((v) => ({
      id: v.id,
      learningProfileId: v.dibsTargetUserProfile?.id,
      nickname: v.dibsTargetUserProfile?.learningNickname,
      userId: v.dibsTargetUserId,
      profile: LearningProfileController.getStudentProfile(v.dibsTargetUserProfile),
      subject: v.dibsTargetUserProfile?.learningProfileType === LearningProfileType.TEACHER ? v.dibsTargetUserProfile?.tchSubject : v.dibsTargetUserProfile?.stuSubject,
      desc: v.dibsTargetUserProfile?.learningProfileType === LearningProfileType.TEACHER ? `${v.dibsTargetUserProfile?.tchUniversity} ${v.dibsTargetUserProfile?.tchDepartment}` :
        `${v.dibsTargetUserProfile?.stuSubject} • ${v.dibsTargetUserProfile?.sex}`,
      learningProfileType: v.dibsTargetUserProfile?.learningProfileType,
    }));

    const receive = receiveList.map((v) => ({
      id: v.id,
      learningProfileId: v.dibsUserProfile?.id,
      nickname: v.dibsUserProfile?.learningNickname,
      userId: v.dibsTargetUserId,
      profile: LearningProfileController.getStudentProfile(v.dibsUserProfile),
      subject: v.dibsUserProfile?.learningProfileType === LearningProfileType.TEACHER ? v.dibsUserProfile?.tchSubject : v.dibsUserProfile?.stuSubject,
      desc: v.dibsUserProfile?.learningProfileType === LearningProfileType.TEACHER ? `${v.dibsUserProfile?.tchUniversity} ${v.dibsUserProfile?.tchDepartment}` :
        `${v.dibsUserProfile?.stuSubject} • ${v.dibsUserProfile?.sex}`,
      learningProfileType: v.dibsUserProfile?.learningProfileType,
    }));

    return {give, receive};
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
          {contactUserId: userId, contactOtherUserId: currentUser.userId, contactServiceType: ServiceType.LEARNING},
        ],
      },
    });
    if (!chatContactInfo) {
      chatContactInfo = await this.chatContactRepository.create({
        contactUserId: currentUser.userId,
        contactOtherUserId: userId,
        contactStatus: ContactStatus.REQUEST,
        contactOtherStatus: ContactStatus.REQUESTED,
        contactServiceType: ServiceType.LEARNING,
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
      chatType: ChatType.HOBBY_CHAT,
    });
  }

}

import {get, getModelSchemaRef, HttpErrors, param, patch, post, Request, requestBody, Response, response, RestBindings} from '@loopback/rest';
import {Count, CountSchema, repository} from '@loopback/repository';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import moment from 'moment';
import {secured, SecuredType} from '../role-authentication';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {ChatType, ContactStatus, FileUploadHandler, MainSocketMsgType, NotificationType, RoomRoleType, ServiceType, UserCredentials} from '../types';
import {Utils} from '../utils';
import {HobbyProfile} from '../models';
import {
  BlockUserRepository,
  ChatContactRepository,
  HobbyProfileRepository,
  HobbyRoomDibsRepository,
  HobbyRoomMemberRepository,
  HobbyRoomRepository,
  NotificationRepository,
  UserRepository,
} from '../repositories';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Server} from 'socket.io';

export class HobbyProfileController {
  constructor(
    @repository(HobbyProfileRepository) public hobbyProfileRepository: HobbyProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @repository(HobbyRoomMemberRepository) public hobbyRoomMemberRepository: HobbyRoomMemberRepository,
    @repository(HobbyRoomDibsRepository) public hobbyRoomDibsRepository: HobbyRoomDibsRepository,
    @repository(BlockUserRepository) public blockUserRepository: BlockUserRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
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

  @get('/hobby-profiles/info')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyProfileInfo() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const profile = await this.hobbyProfileRepository.findOne({where: {userId: currentUser.userId}});
    const joinRooms = await this.hobbyRoomMemberRepository.find({where: {memberUserId: currentUser.userId, memberRole: RoomRoleType.MEMBER}, include: [{relation: 'hobbyRoom'}]});
    const createRooms = await this.hobbyRoomRepository.find({where: {userId: currentUser.userId}});
    const dibRooms = await this.hobbyRoomDibsRepository.find({where: {dibsUserId: currentUser.userId}, include: [{relation: 'hobbyRoom'}]});

    return {
      profile,
      joinRooms: joinRooms.map((v) => v.hobbyRoom),
      createRooms,
      dibsRooms: dibRooms.map((v) => v.hobbyRoom),
    }
  }

  @get('/hobby-profiles/other-info')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyOtherProfileInfo(
    @param.query.string('userId') userId: string
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const otherProfile = await this.hobbyProfileRepository.findOne({where: {userId: userId}});
    if(!otherProfile) throw new HttpErrors.BadRequest('존재하지 않는 회원입니다.');
    const blockInfo = await this.blockUserRepository.findOne({where: {blockUserId: currentUser.userId, blockOtherUserId: otherProfile?.userId, blockServiceType: ServiceType.HOBBY}});
    const joinRooms = await this.hobbyRoomMemberRepository.find({where: {memberUserId: userId, memberRole: RoomRoleType.MEMBER}, include: [{relation: 'hobbyRoom'}]});
    const createRooms = await this.hobbyRoomRepository.find({where: {userId: userId}});
    const hobbyChatList = await this.chatContactRepository.findOne(
      {where: {or: [{contactUserId: currentUser.userId, contactOtherUserId: userId}, {contactUserId: userId, contactOtherUserId: currentUser.userId}]}}
    )
    otherProfile.hobbyResidence = otherProfile?.hobbyResidence ? otherProfile.hobbyResidence.split(' ').slice(0,2).join(' ') : '';
    return {
      profile: {...otherProfile, isBlock: !!blockInfo, isChat: !!hobbyChatList},
      joinRooms: joinRooms.map((v) => v.hobbyRoom),
      createRooms,
    }
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

  @get('/hobby-profiles/request-chat')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRequestChat(
    @ws.namespace('main') nspMain: Server,
    @param.query.string('userId') userId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;

    const myHobbyInfo = await this.hobbyProfileRepository.findOne({where: {userId: currentUser.userId}});
    const otherUserHobbyInfo = await this.hobbyProfileRepository.findOne({where: {userId: userId}});
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: userId,
      notificationMsg: myHobbyInfo?.hobbyNickname + '님이 대화신청을 보냈습니다.',
      notificationType: NotificationType.NORMAL,
      notificationServiceType: ServiceType.HOBBY,
    });
    let chatContactInfo = await this.chatContactRepository.findOne({
      where: {
        or: [
          {contactUserId: currentUser.userId, contactOtherUserId: userId, contactServiceType: ServiceType.HOBBY},
          {contactUserId: userId, contactOtherUserId: currentUser.userId, contactServiceType: ServiceType.HOBBY}
        ],
      },
    });
    if (!chatContactInfo) {
      chatContactInfo = await this.chatContactRepository.create({
        contactUserId: currentUser.userId,
        contactOtherUserId: userId,
        contactStatus: ContactStatus.ALLOW,
        contactOtherStatus: ContactStatus.ALLOW,
        contactServiceType: ServiceType.HOBBY
      });
    }
    nspMain.to(userId).emit(MainSocketMsgType.SRV_REQUEST_CHAT, {
      callUserId: currentUser.userId,
      callUserName: myHobbyInfo?.hobbyNickname,
      callUserProfile: myHobbyInfo?.hobbyPhoto,
      contactId: chatContactInfo.id,
      chatType: ChatType.HOBBY_CHAT
    });
  }
}

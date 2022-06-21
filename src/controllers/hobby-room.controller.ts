import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {del, get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {Filter, repository} from '@loopback/repository';
import moment from 'moment';
import {MainSocketMsgType, NotificationType, RoomMemberJoinType, RoomRoleType, ServiceType, UserCredentials} from '../types';
import {
  FlowerHistoryRepository,
  HobbyProfileRepository,
  HobbyRoomBoardRepository,
  HobbyRoomDibsRepository,
  HobbyRoomMemberRepository,
  HobbyRoomQuestionRepository,
  HobbyRoomRepository,
  NotificationRepository,
  UserRepository,
} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {HobbyRoom} from '../models';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Server} from 'socket.io';

export class HobbyRoomController {
  constructor(
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(HobbyProfileRepository) public hobbyProfileRepository: HobbyProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(HobbyRoomMemberRepository) public hobbyRoomMemberRepository: HobbyRoomMemberRepository,
    @repository(HobbyRoomBoardRepository) public hobbyRoomBoardRepository: HobbyRoomBoardRepository,
    @repository(HobbyRoomQuestionRepository) public hobbyRoomQuestionRepository: HobbyRoomQuestionRepository,
    @repository(HobbyRoomDibsRepository) public hobbyRoomDibsRepository: HobbyRoomDibsRepository,
    @repository(NotificationRepository) public notificationRepository: NotificationRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @get('/hobby-rooms')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomList(
    @param.query.string('searchType') searchType: string,
    @param.query.string('searchText') searchText?: string,
    @param.query.string('searchCategory') searchCategory?: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const hobbyProfile = await this.hobbyProfileRepository.findOne({where: {userId: currentUser.userId}});
    const filter: Filter<HobbyRoom> = {};
    filter.where = {isRoomDelete: false};
    if(searchType === 'findCategory') {
    } else if(searchType === 'sameRegion') {
      filter.order = ['createdAt desc'];
    } else {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
    if(searchText) {
      filter.where.roomTitle = {like: `%${searchText}%`};
    }
    if(searchCategory && searchCategory !== '전체' && searchCategory !== 'all') {
      filter.where.roomCategory = searchCategory;
    }
    const roomList = await this.hobbyRoomRepository.find(filter);
    return roomList.map((room) => ({
      id: room.id,
      roomTitle: room.roomTitle,
      roomRegion: room.roomRegion,
      roomPhotoMain: room.roomPhotoMain,
      roomMemberNumber: room.roomMemberNumber,
    }));
  }

  @post('/hobby-rooms')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomCreate(
    @param.query.number('month') month: 1 | 3 | 6 | 12,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(HobbyRoom, {
            title: 'HobbyRoomData',
            exclude: ['id', 'userId', 'roomExpiredDate', 'roomMemberNumber'],
          }),
        },
      },
    }) roomData: Omit<HobbyRoom, 'id'>,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const needFlower = {1: 500, 3: 1000, 6: 2000, 12: 4000}[month];
    if (!needFlower) {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
    if (needFlower > currentUser.userFlower) {
      throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    }
    roomData.userId = currentUser.userId;
    roomData.roomExpiredDate = moment().add(month, 'months').toDate();
    roomData.roomMemberNumber = 1;
    const roomInfo = await this.hobbyRoomRepository.create(roomData);
    await this.flowerHistoryRepository.create({
      flowerUserId: currentUser.userId,
      flowerContent: roomData.roomTitle + ' 취미 방 개설',
      flowerValue: -needFlower,
    });
    await this.hobbyRoomMemberRepository.create({
      roomId: roomInfo.id, memberUserId: currentUser.userId, memberRole: RoomRoleType.ADMIN, memberJoinStatus: RoomMemberJoinType.CREATOR, memberIsAllow: true,
    });
    await this.userRepository.updateById(currentUser.userId, {userFlower: currentUser.userFlower - needFlower});
    return {id: roomInfo.id};
  }

  @patch('/hobby-rooms/{roomId}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async updateAll(
    @param.path.string('roomId') roomId: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(HobbyRoom, {partial: true}),
        },
      },
    })
      roomData: Omit<HobbyRoom, 'id' | 'userId' | 'createdAt'>,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    return this.hobbyRoomRepository.updateById(roomId, roomData);
  }

  @get('/hobby-rooms/{roomId}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomInfo(
    @param.path.string('roomId') roomId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    const isRoomAdmin = currentUser.userId === roomInfo.userId;
    const roomJoin = await this.hobbyRoomMemberRepository.findOne({where: {roomId, memberUserId: currentUser.userId, memberIsAllow: true}});
    const dibsCount = await this.hobbyRoomDibsRepository.count({dibsRoomId: roomId, dibsUserId: currentUser.userId});
    return {...roomInfo, isRoomAdmin, isRoomJoin: !!roomJoin, isDibs: dibsCount.count > 0};
  }

  @del('/hobby-rooms/{roomId}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomDel(
    @param.path.string('roomId') roomId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    await this.hobbyRoomRepository.updateById(roomId, {isRoomDelete: true});
  }

  @get('/hobby-rooms/{roomId}/recommend-users')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomCreateRecommendUsers(
    @param.path.string('roomId') roomId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    const roomMembers = await this.hobbyRoomMemberRepository.find({where: {roomId: roomId}});
    const hobbyProfiles = await this.hobbyProfileRepository.find({where: {userId: {nin: roomMembers.map((v) => v.memberUserId)}, hobbyCategories: {like: `%${roomInfo.roomCategory}%`}}});
    return hobbyProfiles.map((v) => ({
      id: v.id,
      userId: v.userId,
      nickname: v.hobbyNickname,
      profile: v.hobbyPhoto,
      residence: v.hobbyResidence,
    }));
  }

  @post('/hobby-rooms/{roomId}/invite-users')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomInviteUsers(
    @param.path.string('roomId') roomId: string,
    @requestBody() userIds: string[],
    @ws.namespace('main') nspMain: Server,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    const hobbyProfile = await this.hobbyProfileRepository.findOne({where: {userId: currentUser.userId}});
    await this.hobbyRoomMemberRepository.createAll(userIds.map((uId) => ({
      roomId: roomId,
      memberUserId: uId,
      memberRole: RoomRoleType.MEMBER,
      memberJoinStatus: RoomMemberJoinType.INVITE_SEND,
      memberIsAllow: false,
    })));

    await this.notificationRepository.createAll(
      userIds.map((uId) => ({
        notificationSendUserId: currentUser.userId,
        notificationReceiveUserId: uId,
        notificationMsg: `${hobbyProfile?.hobbyNickname}님이 ${roomInfo.roomTitle}방에 초대했습니다.`,
        notificationType: NotificationType.ROOM_INVITE_RECV,
        notificationServiceType: ServiceType.HOBBY,
        notificationDesc: roomId,
      })),
    );
    userIds.map((uId) => {
      nspMain.to(uId).emit(MainSocketMsgType.SRV_NOTIFICATION, {
        title: '취미방초대',
        msg: `${hobbyProfile?.hobbyNickname}님이 ${roomInfo.roomTitle}방에 초대했습니다.`,
        icon: roomInfo.roomPhotoMain,
      });
    });
  }

  @get('/hobby-rooms/{roomId}/members')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomMembers(
    @param.path.string('roomId') roomId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId, {
      include: [{
        relation: 'roomMembers',
        scope: {
          include: [{
            relation: 'hobbyProfile',
          }],
        },
      }],
    });
    const isRoomAdmin = roomInfo.userId === currentUser.userId;
    const members = roomInfo.roomMembers?.map((m) => ({
      id: m.hobbyProfile?.id,
      userId: m.hobbyProfile?.userId,
      nickname: m.hobbyProfile?.hobbyNickname,
      profile: m.hobbyProfile?.hobbyPhoto,
      residence: m.hobbyProfile?.hobbyResidence,
      memberId: m.id,
      memberJoinStatus: m.memberJoinStatus,
      memberJoinText: m.memberJoinText,
      memberIsAllow: m.memberIsAllow,
      updateAt: m.updatedAt,
    }));
    const invites = !isRoomAdmin ? [] : members?.filter((v) => {
      if (v.memberJoinStatus === RoomMemberJoinType.INVITE_SEND) {
        return true;
      } else if (
        (v.memberJoinStatus === RoomMemberJoinType.INVITE_REJECT || v.memberJoinStatus === RoomMemberJoinType.INVITE_ALLOW) &&
        moment(v.updateAt).add(24, 'hours') < moment()
      ) {
        return true;
      } else {
        return false;
      }
    });
    const requests = !isRoomAdmin ? [] : members?.filter((v) => (v.memberJoinStatus === RoomMemberJoinType.REQUEST_RECV || v.memberJoinStatus === RoomMemberJoinType.REQUEST_REJECT));
    const allows = members?.filter((v) => v.memberIsAllow);
    return {invites: invites ?? [], requests: requests ?? [], allows: allows ?? [], isRoomAdmin};
  }

  @get('/hobby-rooms/{roomId}/remove-member')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomRemoveMember(
    @param.path.string('roomId') roomId: string,
    @param.query.string('userId') userId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    await this.hobbyRoomMemberRepository.deleteAll({roomId: roomId, memberUserId: userId});
    const memberNumber = await this.hobbyRoomMemberRepository.count({roomId: roomId, memberIsAllow: true});
    await this.hobbyRoomRepository.updateById(roomId, {roomMemberNumber: memberNumber.count});
  }

  @get('/hobby-rooms/{roomId}/boards')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomBoards(
    @param.path.string('roomId') roomId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    const list = await this.hobbyRoomBoardRepository.find({where: {boardRoomId: roomId}, order: ['boardIsPin desc', 'createdAt desc']});
    return {
      list,
      isRoomAdmin: roomInfo.userId === currentUser.userId,
    };
  }

  @post('/hobby-rooms/{roomId}/upsert-board')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomAddBoard(
    @param.path.string('roomId') roomId: string,
    @requestBody() data: {title: string, content: string, isPin: boolean, boardId?: string},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    if (!data.boardId) {
      return this.hobbyRoomBoardRepository.create({
        boardRoomId: roomId,
        boardUserId: currentUser.userId,
        boardTitle: data.title,
        boardContent: data.content,
        boardIsPin: data.isPin,
      });
    } else {
      return this.hobbyRoomBoardRepository.updateById(data.boardId, {
        boardUserId: currentUser.userId,
        boardTitle: data.title,
        boardContent: data.content,
        boardIsPin: data.isPin,
      });
    }

  }

  @del('/hobby-rooms/{roomId}/del-board')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomDelBoard(
    @param.path.string('roomId') roomId: string,
    @param.query.string('boardId') boardId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    return this.hobbyRoomBoardRepository.deleteById(boardId);
  }

  @post('/hobby-rooms/{roomId}/join-request')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomJoinRequest(
    @param.path.string('roomId') roomId: string,
    @requestBody() data: {text: string},
    @ws.namespace('main') nspMain: Server,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    const hobbyProfile = await this.hobbyProfileRepository.findOne({where: {userId: currentUser.userId}});
    const memberInfo = await this.hobbyRoomMemberRepository.findOne({where: {roomId, memberUserId: currentUser.userId}});
    if (memberInfo) throw new HttpErrors.BadRequest('이미 신청을 했습니다.');
    await this.hobbyRoomMemberRepository.create({
      roomId,
      memberUserId: currentUser.userId,
      memberJoinText: data.text,
      memberRole: RoomRoleType.MEMBER,
      memberJoinStatus: roomInfo.roomNeedAllow ? RoomMemberJoinType.REQUEST_RECV : RoomMemberJoinType.REQUEST_ALLOW,
      memberIsAllow: !roomInfo.roomNeedAllow,
    });
    if (roomInfo.roomNeedAllow) {
      await this.notificationRepository.create({
        notificationSendUserId: currentUser.userId,
        notificationReceiveUserId: roomInfo.userId,
        notificationMsg: `${hobbyProfile?.hobbyNickname}님이 ${roomInfo.roomTitle}방에 가입신청을 했습니다.`,
        notificationType: NotificationType.ROOM_REQUEST_RECV,
        notificationServiceType: ServiceType.HOBBY,
        notificationDesc: roomId,
      });
      nspMain.to(roomInfo.userId).emit(MainSocketMsgType.SRV_NOTIFICATION, {
        title: '취미방 가입신청',
        msg: `${hobbyProfile?.hobbyNickname}님이 ${roomInfo.roomTitle}방에 가입신청을 했습니다.`,
        icon: roomInfo.roomPhotoMain,
      });
    }
  }

  @post('/hobby-rooms/{roomId}/question')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomQuestion(
    @param.path.string('roomId') roomId: string,
    @requestBody() data: {text: string},
    @ws.namespace('main') nspMain: Server,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    const hobbyProfile = await this.hobbyProfileRepository.findOne({where: {userId: currentUser.userId}});
    const questionInfo = await this.hobbyRoomQuestionRepository.create({
      questionRoomId: roomId,
      questionAdminId: roomInfo.userId,
      questionUserId: currentUser.userId,
      questionText: data.text,
    });
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: roomInfo.userId,
      notificationMsg: `${hobbyProfile?.hobbyNickname}님이 ${roomInfo.roomTitle}방 운영자님께 질문을 했습니다.`,
      notificationType: NotificationType.ROOM_QUESTION,
      notificationServiceType: ServiceType.HOBBY,
      notificationDesc: questionInfo.id,
    });
    nspMain.to(roomInfo.userId).emit(MainSocketMsgType.SRV_NOTIFICATION, {
      title: '취미방 질문',
      msg: `${hobbyProfile?.hobbyNickname}님이 ${roomInfo.roomTitle}방 운영자님께 질문을 했습니다.`,
      icon: roomInfo.roomPhotoMain,
    });
  }

  @get('/hobby-rooms/question-info')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomQuestionInfo(
    @param.query.string('questionId') questionId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const questionInfo = await this.hobbyRoomQuestionRepository.findById(questionId);
    if(questionInfo.questionUserId !== currentUser.userId && questionInfo.questionAdminId !== currentUser.userId) throw new HttpErrors.BadRequest('승인되지 않은 요청입니다.');
    return questionInfo;
  }


  @post('/hobby-rooms/question-answer')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomQuestionAnswer(
    @requestBody() data: {questionId: string, answerText: string},
    @ws.namespace('main') nspMain: Server,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const questionInfo = await this.hobbyRoomQuestionRepository.findById(data.questionId);
    if (questionInfo.questionAdminId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    const roomInfo = await this.hobbyRoomRepository.findById(questionInfo.questionRoomId);
    const hobbyProfile = await this.hobbyProfileRepository.findOne({where: {userId: questionInfo.questionUserId}});
    await this.hobbyRoomQuestionRepository.updateById(data.questionId, {questionAnswerText: data.answerText});
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: questionInfo.questionUserId,
      notificationMsg: `${roomInfo.roomTitle}방 운영자님이 ${hobbyProfile?.hobbyNickname}님의 질문에 답변을 했습니다.`,
      notificationType: NotificationType.ROOM_ANSWER,
      notificationServiceType: ServiceType.HOBBY,
      notificationDesc: data.questionId,
    });
    nspMain.to(questionInfo.questionUserId).emit(MainSocketMsgType.SRV_NOTIFICATION, {
      title: '취미방 답변',
      msg: `${roomInfo.roomTitle}방 운영자님이 ${hobbyProfile?.hobbyNickname}님의 질문에 답변을 했습니다.`,
      icon: roomInfo.roomPhotoMain,
    });
  }

  @post('/hobby-rooms/{roomId}/member-change')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomMemberChange(
    @param.path.string('roomId') roomId: string,
    @requestBody() data: {memberId: string, type: RoomMemberJoinType},
    @ws.namespace('main') nspMain: Server,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const hobbyProfile = await this.hobbyProfileRepository.findOne({where: {userId: currentUser.userId}});
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId && (data.type === RoomMemberJoinType.REQUEST_ALLOW || data.type === RoomMemberJoinType.REQUEST_REJECT)) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    const memberInfo = await this.hobbyRoomMemberRepository.findById(data.memberId);
    const updateData: any = {memberJoinStatus: data.type};
    if (data.type === RoomMemberJoinType.REQUEST_ALLOW) {
      updateData.memberIsAllow = true;
    }
    await this.hobbyRoomMemberRepository.updateById(data.memberId, updateData);
    const memberCount = await this.hobbyRoomMemberRepository.count({roomId, memberIsAllow: true});
    await this.hobbyRoomRepository.updateById(roomId, {roomMemberNumber: memberCount.count});

    let notificationMsg = '', receiveUserId = '', notificationType = NotificationType.ROOM_REQUEST_ALLOW;
    if (data.type === RoomMemberJoinType.REQUEST_ALLOW) {
      notificationMsg = `${roomInfo.roomTitle}방의 운영자님이 가입요청을 수락했습니다.`;
      receiveUserId = memberInfo.memberUserId;
      notificationType = NotificationType.ROOM_REQUEST_ALLOW;
    } else if (data.type === RoomMemberJoinType.REQUEST_REJECT) {
      notificationMsg = `${roomInfo.roomTitle}방의 운영자님이 가입요청을 거부했습니다.`;
      receiveUserId = memberInfo.memberUserId;
      notificationType = NotificationType.ROOM_REQUEST_REJECT;
    } else if (data.type === RoomMemberJoinType.INVITE_ALLOW) {
      notificationMsg = `${hobbyProfile?.hobbyNickname}님이 ${roomInfo.roomTitle}방초대를 수락했습니다.`;
      receiveUserId = roomInfo.userId;
      notificationType = NotificationType.ROOM_INVITE_ALLOW;
    } else if (data.type === RoomMemberJoinType.INVITE_REJECT) {
      notificationMsg = `${hobbyProfile?.hobbyNickname}님이 ${roomInfo.roomTitle}방초대를 거부했습니다.`;
      receiveUserId = roomInfo.userId;
      notificationType = NotificationType.ROOM_INVITE_REJECT;
    }
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: receiveUserId,
      notificationMsg: notificationMsg,
      notificationType: notificationType,
      notificationServiceType: ServiceType.HOBBY,
      notificationDesc: roomId,
    });
    nspMain.to(receiveUserId).emit(MainSocketMsgType.SRV_NOTIFICATION, {
      title: '취미방 멤버',
      msg: notificationMsg,
      icon: roomInfo.roomPhotoMain,
    });
  }

  @get('/hobby-rooms/{roomId}/dibs')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomDibs(
    @param.path.string('roomId') roomId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const info = await this.hobbyRoomDibsRepository.findOne({where: {dibsRoomId: roomId, dibsUserId: currentUser.userId}});
    if (!info) {
      await this.hobbyRoomDibsRepository.create({dibsRoomId: roomId, dibsUserId: currentUser.userId});
    } else {
      await this.hobbyRoomDibsRepository.deleteById(info.id);
    }
  }

}

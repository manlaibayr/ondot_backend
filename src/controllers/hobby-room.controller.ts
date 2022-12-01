import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {del, get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {Count, Filter, repository} from '@loopback/repository';
import moment from 'moment';
import {v4 as uuidv4} from 'uuid';
import {ChatMsgType, ChatSocketMsgType, FlowerHistoryType, MainSocketMsgType, NotificationType, RoomMemberJoinType, RoomRoleType, ServiceType, UserCredentials} from '../types';
import {
  ChatGroupMsgRepository,
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
import {HobbyRoom, HobbyRoomWithRelations} from '../models';
import {ws} from '../websockets/decorators/websocket.decorator';
import {Server} from 'socket.io';
import {Utils} from '../utils';

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
    @repository(ChatGroupMsgRepository) public chatGroupMsgRepository: ChatGroupMsgRepository,
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
    filter.where = {isRoomDelete: false, roomIsShow: true};
    if (searchType === 'findCategory') {
    } else if (searchType === 'sameRegion') {
      filter.order = ['createdAt desc'];
    } else {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
    if (searchText) {
      filter.where.roomTitle = {like: `%${searchText}%`};
    }
    if (searchCategory && searchCategory !== '전체' && searchCategory !== 'all') {
      filter.where.roomCategory = searchCategory;
    }
    const roomList = await this.hobbyRoomRepository.find(filter);
    if(searchType === 'sameRegion') {
      const userRegion = hobbyProfile?.hobbyResidence ?? '';
      const getSameCharCount = (str1: string, str2: string) => {
        let count = 0;
        for(let i = 0; i < str1.length; i++) {
          if(str2.indexOf(str1[i]) !== -1) count++;
        }
        return count;
      };
      roomList.sort((a: HobbyRoom, b: HobbyRoom) => getSameCharCount(userRegion, a.roomRegion) - getSameCharCount(userRegion, b.roomRegion));
    }
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
    if (needFlower > (currentUser.payFlower + currentUser.freeFlower)) {
      throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    }
    roomData.userId = currentUser.userId;
    roomData.roomExpiredDate = moment().add(month, 'months').toDate();
    roomData.roomMemberNumber = 1;
    const roomInfo = await this.hobbyRoomRepository.create(roomData);
    await this.hobbyRoomMemberRepository.create({
      roomId: roomInfo.id, memberUserId: currentUser.userId, memberRole: RoomRoleType.ADMIN, memberJoinStatus: RoomMemberJoinType.CREATOR, memberIsAllow: true,
    });

    const updateFlowerInfo = Utils.calcUseFlower(currentUser.freeFlower, currentUser.payFlower, needFlower);
    await this.userRepository.updateById(currentUser.userId, {freeFlower: updateFlowerInfo.updateFlower.freeFlower, payFlower: updateFlowerInfo.updateFlower.payFlower});
    await this.flowerHistoryRepository.createAll(updateFlowerInfo.history.map((v: any) => ({
      flowerUserId: currentUser.userId,
      flowerContent: roomData.roomTitle + ' 취미 방 개설',
      flowerValue: v.flowerValue,
      isFreeFlower: v.isFreeFlower,
      flowerHistoryType: FlowerHistoryType.CREATE_ROOM,
      flowerHistoryRefer: roomInfo.id
    })))

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
    const roomMemberInfo = await this.hobbyRoomMemberRepository.findOne({where: {roomId, memberUserId: currentUser.userId, memberIsAllow: true}});
    const dibsCount = await this.hobbyRoomDibsRepository.count({dibsRoomId: roomId, dibsUserId: currentUser.userId});
    return {...roomInfo, isRoomAdmin, isRoomJoin: !!roomMemberInfo, isDibs: dibsCount.count > 0, isKicked: roomMemberInfo?.memberJoinStatus === RoomMemberJoinType.KICK};
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
      isRoomCreator: m.hobbyProfile?.userId === roomInfo.userId,
    }));
    const isRoomMember = members?.some((m) => m.userId === currentUser.userId);
    const invites = !isRoomAdmin ?
      members?.filter((v) => (v.memberJoinStatus === RoomMemberJoinType.INVITE_SEND && v.userId === currentUser.userId)) :
      members?.filter((v) => {
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
    const requests = !isRoomAdmin ?
      members?.filter((v) => (v.memberJoinStatus === RoomMemberJoinType.REQUEST_RECV && v.userId === currentUser.userId)) :
      members?.filter((v) => (v.memberJoinStatus === RoomMemberJoinType.REQUEST_RECV || v.memberJoinStatus === RoomMemberJoinType.REQUEST_REJECT));
    const kicks = !isRoomAdmin ? [] : members?.filter((v) => (v.memberJoinStatus === RoomMemberJoinType.KICK))
    const allows = isRoomMember ? members?.filter((v) => (v.memberIsAllow && v.memberJoinStatus !== RoomMemberJoinType.KICK)) : [];
    return {invites: invites ?? [], requests: requests ?? [], allows: allows ?? [], kicks, isRoomAdmin};
  }

  @get('/hobby-rooms/{roomId}/remove-member')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomRemoveMember(
    @param.path.string('roomId') roomId: string,
    @param.query.string('userId') userId: string,
    @ws.namespace('main') nspMain: Server,
    @ws.namespace('chat') nspChat: Server,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId && userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    await this.hobbyRoomMemberRepository.deleteAll({roomId: roomId, memberUserId: userId});
    const removeUserInfo = await this.hobbyProfileRepository.findOne({where: {userId}});
    const memberNumber = await this.hobbyRoomMemberRepository.count({roomId: roomId, memberIsAllow: true});
    await this.hobbyRoomRepository.updateById(roomId, {roomMemberNumber: memberNumber.count});

    await this.chatGroupMsgRepository.create({
      groupRoomId: roomId,
      groupSenderUserId: currentUser.userId,
      groupMsgType: ChatMsgType.SYSTEM,
      groupMsgContent: removeUserInfo?.hobbyNickname + '님이 탈퇴되었습니다.',
    });
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: roomInfo.userId,
      notificationMsg: removeUserInfo?.hobbyNickname + '님이 탈퇴되었습니다.',
      notificationType: NotificationType.ROOM_KICK,
      notificationServiceType: ServiceType.HOBBY,
      notificationDesc: roomId,
    });

    nspChat.to(roomId).emit(ChatSocketMsgType.SRV_RECEIVE_MSG, {
      id: uuidv4(),
      type: ChatMsgType.SYSTEM,
      content: removeUserInfo?.hobbyNickname + '님이 탈퇴되었습니다.',
      chatInfo: {},
    });
    nspMain.to(userId).emit(MainSocketMsgType.SRV_NOTIFICATION, {
      title: `취미방 강퇴`,
      msg: `${roomInfo.roomTitle}모임에서 강퇴되었습니다.`,
      icon: roomInfo.roomPhotoMain,
    });
  }

  @post('/hobby-rooms/{roomId}/remove-users')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomRemoveUsers(
    @param.path.string('roomId') roomId: string,
    @requestBody() userIds: string[],
    @ws.namespace('main') nspMain: Server,
    @ws.namespace('chat') nspChat: Server,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    await this.hobbyRoomMemberRepository.updateAll({memberJoinStatus: RoomMemberJoinType.KICK, memberIsAllow: false}, {roomId: roomId, memberUserId: {inq: userIds}});
    const removeProfileList = await this.hobbyProfileRepository.find({where: {userId: {inq: userIds}}});
    const memberNumber = await this.hobbyRoomMemberRepository.count({roomId: roomId, memberIsAllow: true});
    await this.hobbyRoomRepository.updateById(roomId, {roomMemberNumber: memberNumber.count});

    await this.chatGroupMsgRepository.create({
      groupRoomId: roomId,
      groupSenderUserId: currentUser.userId,
      groupMsgType: ChatMsgType.SYSTEM,
      groupMsgContent: removeProfileList.map((v) => v?.hobbyNickname).join(',') + '님이 탈퇴되었습니다.',
    });
    await this.notificationRepository.createAll(
      removeProfileList.map((p) => ({
        notificationSendUserId: currentUser.userId,
        notificationReceiveUserId: p.userId,
        notificationMsg: `${roomInfo.roomTitle}님이 탈퇴되었습니다.`,
        notificationType: NotificationType.ROOM_KICK,
        notificationServiceType: ServiceType.HOBBY,
        notificationDesc: roomId,
      })),
    );
    // 강퇴시킨 회원들을 방에서 추방
    try {
      for (const socketId in nspChat.sockets) {
        const socketList: any = nspChat.sockets;
        if (Object.keys(socketList[socketId].rooms).filter((r: any) => userIds.some((u) => r === u)).length > 0) {
          socketList[socketId].disconnect();
        }
      }
    } catch (e) {
      console.error(e);
    }
    nspChat.to(roomId).emit(ChatSocketMsgType.SRV_RECEIVE_MSG, {
      id: uuidv4(),
      type: ChatMsgType.SYSTEM,
      content: removeProfileList.map((v) => v?.hobbyNickname).join(',') + '님이 탈퇴되었습니다.',
      chatInfo: {},
    });
  }


  @get('/hobby-rooms/{roomId}/cancel-kick-member')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomCancelKickMember(
    @param.path.string('roomId') roomId: string,
    @param.query.string('userId') userId: string,
    @ws.namespace('main') nspMain: Server,
    @ws.namespace('chat') nspChat: Server,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId && userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    await this.hobbyRoomMemberRepository.updateAll({memberJoinStatus: RoomMemberJoinType.INVITE_ALLOW}, {roomId: roomId, memberUserId: userId});
    const userInfo = await this.hobbyProfileRepository.findOne({where: {userId}});
    const memberNumber = await this.hobbyRoomMemberRepository.count({roomId: roomId, memberIsAllow: true});
    await this.hobbyRoomRepository.updateById(roomId, {roomMemberNumber: memberNumber.count});

    await this.chatGroupMsgRepository.create({
      groupRoomId: roomId,
      groupSenderUserId: currentUser.userId,
      groupMsgType: ChatMsgType.SYSTEM,
      groupMsgContent: userInfo?.hobbyNickname + '님의 강퇴가 취소되었습니다.',
    });
    await this.notificationRepository.create({
      notificationSendUserId: currentUser.userId,
      notificationReceiveUserId: roomInfo.userId,
      notificationMsg: userInfo?.hobbyNickname + '님의 강퇴가 취소되었습니다.',
      notificationType: NotificationType.ROOM_KICK,
      notificationServiceType: ServiceType.HOBBY,
      notificationDesc: roomId,
    });

    nspChat.to(roomId).emit(ChatSocketMsgType.SRV_RECEIVE_MSG, {
      id: uuidv4(),
      type: ChatMsgType.SYSTEM,
      content: userInfo?.hobbyNickname + '님의 강퇴가 취소되었습니다.',
      chatInfo: {},
    });
    nspMain.to(userId).emit(MainSocketMsgType.SRV_NOTIFICATION, {
      title: `취미방 강퇴취소`,
      msg: `${roomInfo.roomTitle}모임에서 강퇴가 취소되었습니다.`,
      icon: roomInfo.roomPhotoMain,
    });
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
    @ws.namespace('chat') nspChat: Server,
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
    let isJoinSuccess = true;
    if (roomInfo.roomNeedAllow) {
      await this.notificationRepository.create({
        notificationSendUserId: currentUser.userId,
        notificationReceiveUserId: roomInfo.userId,
        notificationMsg: `${hobbyProfile?.hobbyNickname}님이 ${roomInfo.roomTitle}방에 가입신청을 했습니다.`,
        notificationType: NotificationType.ROOM_REQUEST_RECV,
        notificationServiceType: ServiceType.HOBBY,
        notificationDesc: roomId,
      });
      isJoinSuccess = false;
      nspMain.to(roomInfo.userId).emit(MainSocketMsgType.SRV_NOTIFICATION, {
        title: '취미방 가입신청',
        msg: `${hobbyProfile?.hobbyNickname}님이 ${roomInfo.roomTitle}방에 가입신청을 했습니다.`,
        icon: roomInfo.roomPhotoMain,
      });
    }
    if (isJoinSuccess) {
      nspChat.to(roomId).emit(ChatSocketMsgType.SRV_RECEIVE_MSG, {
        id: uuidv4(),
        type: ChatMsgType.SYSTEM,
        content: hobbyProfile?.hobbyNickname + '님이 모임에 가입했습니다.',
        chatInfo: {},
      });
    }
    return {isJoinSuccess};
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
    if (questionInfo.questionUserId !== currentUser.userId && questionInfo.questionAdminId !== currentUser.userId) throw new HttpErrors.BadRequest('승인되지 않은 요청입니다.');
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
    @ws.namespace('chat') nspChat: Server,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const hobbyProfile = await this.hobbyProfileRepository.findOne({where: {userId: currentUser.userId}});
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId && (data.type === RoomMemberJoinType.REQUEST_ALLOW || data.type === RoomMemberJoinType.REQUEST_REJECT)) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    const memberInfo = await (data.memberId ? this.hobbyRoomMemberRepository.findById(data.memberId) : this.hobbyRoomMemberRepository.findOne({where: {roomId, memberUserId: currentUser.userId}}));
    if (!memberInfo) throw new HttpErrors.BadRequest('파라미터가 정확하지 않습니다.');
    const updateData: any = {memberJoinStatus: data.type};
    if (data.type === RoomMemberJoinType.REQUEST_ALLOW || data.type === RoomMemberJoinType.INVITE_ALLOW) {
      updateData.memberIsAllow = true;
    }
    await this.hobbyRoomMemberRepository.updateById(memberInfo.id, updateData);
    const memberCount = await this.hobbyRoomMemberRepository.count({roomId, memberIsAllow: true});
    await this.hobbyRoomRepository.updateById(roomId, {roomMemberNumber: memberCount.count});
    if (updateData.memberIsAllow) {
      await this.chatGroupMsgRepository.create({
        groupRoomId: roomId,
        groupSenderUserId: currentUser.userId,
        groupMsgType: ChatMsgType.SYSTEM,
        groupMsgContent: hobbyProfile?.hobbyNickname + '님이 모임에 가입했습니다.',
      });
      nspChat.to(roomId).emit(ChatSocketMsgType.SRV_RECEIVE_MSG, {
        id: uuidv4(),
        type: ChatMsgType.SYSTEM,
        content: hobbyProfile?.hobbyNickname + '님이 모임에 가입했습니다.',
        chatInfo: {},
      });
    }

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

  @get('/hobby-rooms/{roomId}/cancel-del')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomCancelDel(
    @param.path.string('roomId') roomId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    if(roomInfo.isRoomDelete && moment(roomInfo.roomExpiredDate) > moment()) {
      await this.hobbyRoomRepository.updateById(roomId, {isRoomDelete: false});
    } else {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
  }

  @get('/hobby-rooms/{roomId}/repurchase')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomRepurchase(
    @param.path.string('roomId') roomId: string,
    @param.query.number('month') month: 1 | 3 | 6 | 12,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    const isExtendRoom = roomInfo.roomExpiredDate > new Date();
    const needFlower = {1: 500, 3: 1000, 6: 2000, 12: 4000}[month];
    if (!needFlower) {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
    if (needFlower > (currentUser.payFlower + currentUser.freeFlower)) {
      throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    }
    const roomExpiredDate = moment(isExtendRoom ? roomInfo.roomExpiredDate : new Date()).add(month, 'months').toDate();
    await this.hobbyRoomRepository.updateById(roomId, {isRoomDelete: false, roomExpiredDate});

    const updateFlowerInfo = Utils.calcUseFlower(currentUser.freeFlower, currentUser.payFlower, needFlower);
    await this.userRepository.updateById(currentUser.userId, {freeFlower: updateFlowerInfo.updateFlower.freeFlower, payFlower: updateFlowerInfo.updateFlower.payFlower});
    await this.flowerHistoryRepository.createAll(updateFlowerInfo.history.map((v: any) => ({
      flowerUserId: currentUser.userId,
      flowerContent: roomInfo.roomTitle + (isExtendRoom ? ' 취미 방 기간 연장' : ' 취미 방 재개설'),
      flowerValue: v.flowerValue,
      isFreeFlower: v.isFreeFlower,
      flowerHistoryType: (isExtendRoom ? FlowerHistoryType.EXTEND_ROOM : FlowerHistoryType.RECREATE_ROOM),
      flowerHistoryRefer: roomId,
    })));
  }

  //*========== admin functions ==========*//
  @get('/hobby-rooms/admin-list')
  @secured(SecuredType.HAS_ROLES, ['ADMIN'])
  async adminGiftingList(
    @param.query.number('page') page: number,
    @param.query.number('count') pageCount: number,
    @param.query.object('search') searchParam?: {text?: string, roomCategory?: string},
    @param.query.object('sort') sortParam?: {field: string, asc: boolean},
  ) {
    if (page < 1) throw new HttpErrors.BadRequest('param is not correct');
    const filter: Filter<HobbyRoom> = {};
    filter.where = {};
    const totalCount: Count = await this.hobbyRoomRepository.count(filter.where);
    filter.skip = (page - 1) * pageCount;
    filter.limit = pageCount;
    filter.include = [{relation: 'user', scope: {fields: ['id', 'username']}}, {relation: 'roomDibs'}];
    if (sortParam?.field) {
      filter.order = [sortParam.field + ' ' + (sortParam.asc ? 'asc' : 'desc')];
    }
    const roomList: HobbyRoomWithRelations[] = await this.hobbyRoomRepository.find(filter);
    const data = roomList.map((v: any) => {
      const roomDibsCount = v.roomDibs?.length || 0;
      delete v.roomDibs;
      return {
        ...v,
        roomDibsCount
      }
    })
    return {
      meta: {
        currentPage: page,
        itemsPerPage: pageCount,
        totalItemCount: totalCount.count,
        totalPageCount: Math.ceil(totalCount.count / pageCount),
      },
      data,
    };
  }

}

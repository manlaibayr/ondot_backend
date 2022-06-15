import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {del, get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {repository} from '@loopback/repository';
import moment from 'moment';
import {RoomMemberJoinType, RoomRoleType, UserCredentials} from '../types';
import {FlowerHistoryRepository, HobbyProfileRepository, HobbyRoomBoardRepository, HobbyRoomMemberRepository, HobbyRoomQuestionRepository, HobbyRoomRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {HobbyRoom} from '../models';

export class HobbyRoomController {
  constructor(
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(HobbyProfileRepository) public hobbyProfileRepository: HobbyProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(HobbyRoomMemberRepository) public hobbyRoomMemberRepository: HobbyRoomMemberRepository,
    @repository(HobbyRoomBoardRepository) public hobbyRoomBoardRepository: HobbyRoomBoardRepository,
    @repository(HobbyRoomQuestionRepository) public hobbyRoomQuestionRepository: HobbyRoomQuestionRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {}

  @get('/hobby-rooms')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomList(
  ) {
    const roomList = await this.hobbyRoomRepository.find({});
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
    if(!needFlower) {
      throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    }
    if(needFlower > currentUser.userFlower) {
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
      roomId: roomInfo.id, memberUserId: currentUser.userId, memberRole: RoomRoleType.ADMIN, memberJoinStatus: RoomMemberJoinType.CREATOR, memberIsAllow: true
    })
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
    if(roomInfo.userId !== currentUser.userId)  throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    return this.hobbyRoomRepository.updateById(roomId, roomData);
  }

  @get('/hobby-rooms/{roomId}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomInfo(
    @param.path.string('roomId') roomId: string
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    const isRoomAdmin = currentUser.userId === roomInfo.userId;
    const roomJoin = await this.hobbyRoomMemberRepository.findOne({where: {roomId, memberUserId: currentUser.userId, memberIsAllow: true}});
    return {...roomInfo, isRoomAdmin, isRoomJoin: !!roomJoin};
  }

  @del('/hobby-rooms/{roomId}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomDel(
    @param.path.string('roomId') roomId: string,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if(roomInfo.userId !== currentUser.userId)  throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    await this.hobbyRoomMemberRepository.deleteAll({roomId});
    await this.hobbyRoomBoardRepository.deleteAll({boardRoomId: roomId});
    await this.hobbyRoomRepository.deleteById(roomId);
  }

  @get('/hobby-rooms/{roomId}/recommend-users')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomCreateRecommendUsers(
    @param.path.string('roomId') roomId: string
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if(roomInfo.userId !== currentUser.userId)  throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    const roomMembers = await this.hobbyRoomMemberRepository.find({where: {roomId: roomId}});
    const hobbyProfiles = await this.hobbyProfileRepository.find({where: {userId: {nin: roomMembers.map((v) => v.memberUserId)}, hobbyCategories: {like: `%${roomInfo.roomCategory}%`}}});
    return hobbyProfiles.map((v) => ({
      id: v.id,
      userId: v.userId,
      nickname: v.hobbyNickname,
      profile: v.hobbyPhoto,
      residence: v.hobbyResidence
    }));
  }

  @post('/hobby-rooms/{roomId}/invite-users')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomInviteUsers(
    @param.path.string('roomId') roomId: string,
    @requestBody() userIds: string[]
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if(roomInfo.userId !== currentUser.userId)  throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    await this.hobbyRoomMemberRepository.createAll(userIds.map((uId) => ({
      roomId: roomId,
      memberUserId: uId,
      memberRole: RoomRoleType.MEMBER,
      memberJoinStatus: RoomMemberJoinType.INVITE_SEND,
      memberIsAllow: false,
    })));
  }

  @get('/hobby-rooms/{roomId}/members')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomMembers(
    @param.path.string('roomId') roomId: string
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId, {
      include: [{
        relation: 'roomMembers',
        scope: {
          include: [{
            relation: 'hobbyProfile'
          }]
        }
      }]
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
      if(v.memberJoinStatus === RoomMemberJoinType.INVITE_SEND) {
        return true;
      } else if(
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
      isRoomAdmin: roomInfo.userId === currentUser.userId
    }
  }

  @post('/hobby-rooms/{roomId}/upsert-board')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomAddBoard(
    @param.path.string('roomId') roomId: string,
    @requestBody() data: {title: string, content: string, isPin: boolean, boardId?: string}
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    if(!data.boardId) {
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
    @requestBody() data: {text: string}
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const memberInfo = await this.hobbyRoomMemberRepository.findOne({where: {roomId, memberUserId: currentUser.userId}});
    if(memberInfo) throw new HttpErrors.BadRequest('이미 신청을 했습니다.');
    await this.hobbyRoomMemberRepository.create({
      roomId,
      memberUserId: currentUser.userId,
      memberJoinText: data.text,
      memberRole: RoomRoleType.MEMBER,
      memberJoinStatus: RoomMemberJoinType.REQUEST_RECV,
      memberIsAllow: false
    });
  }

  @post('/hobby-rooms/{roomId}/question')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomQuestion(
    @param.path.string('roomId') roomId: string,
    @requestBody() data: {text: string}
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    await this.hobbyRoomQuestionRepository.create({
      questionRoomId: roomId,
      questionAdminId: roomInfo.userId,
      questionUserId: currentUser.userId,
      questionText: data.text,
    });
  }

  @post('/hobby-rooms/{roomId}/member-change')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomMemberChange(
    @param.path.string('roomId') roomId: string,
    @requestBody() data: {memberId: string, type: RoomMemberJoinType}
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    if (roomInfo.userId !== currentUser.userId) throw new HttpErrors.BadRequest('잘못된 요청입니다.');
    const updateData: any = {memberJoinStatus: data.type};
    if(data.type === RoomMemberJoinType.REQUEST_ALLOW) updateData.memberIsAllow = true;
    await this.hobbyRoomMemberRepository.updateById(data.memberId, updateData)
    const memberCount = await this.hobbyRoomMemberRepository.count({roomId, memberIsAllow: true});
    await this.hobbyRoomRepository.updateById(roomId, {roomMemberNumber: memberCount.count});
  }
}

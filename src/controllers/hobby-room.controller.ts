import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {get, getModelSchemaRef, HttpErrors, param, post, requestBody} from '@loopback/rest';
import {repository} from '@loopback/repository';
import moment from 'moment';
import {RoomMemberJoinType, RoomRoleType, UserCredentials} from '../types';
import {FlowerHistoryRepository, HobbyProfileRepository, HobbyRoomMemberRepository, HobbyRoomRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {HobbyRoom} from '../models';

export class HobbyRoomController {
  constructor(
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @repository(HobbyProfileRepository) public hobbyProfileRepository: HobbyProfileRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(HobbyRoomMemberRepository) public hobbyRoomMemberRepository: HobbyRoomMemberRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {}

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

  @get('/hobby-rooms/{roomId}')
  @secured(SecuredType.IS_AUTHENTICATED)
  async hobbyRoomInfo(
    @param.path.string('roomId') roomId: string
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const roomInfo = await this.hobbyRoomRepository.findById(roomId);
    return roomInfo;
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
      memberJoinStatus: m.memberJoinStatus,
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
}

import {repository} from '@loopback/repository';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {BlockPhoneRepository, BlockUserRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {get, post, requestBody} from '@loopback/rest';
import {ServiceType, UserCredentials} from '../types';

export class BlockController {
  constructor(
    @repository(BlockUserRepository) public blockUserRepository: BlockUserRepository,
    @repository(BlockPhoneRepository) public blockPhoneRepository: BlockPhoneRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @post('/block-users')
  @secured(SecuredType.IS_AUTHENTICATED)
  async blockUserChange(
    @requestBody() data: {otherUserId: string}
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const blockInfo = await this.blockUserRepository.findOne({where: {blockUserId: currentUser.userId, blockOtherUserId: data.otherUserId, blockServiceType: ServiceType.MEETING}});
    if(blockInfo) {
      await this.blockUserRepository.deleteById(blockInfo.id);
      return {block: false};
    } else {
      await this.blockUserRepository.create({blockUserId: currentUser.userId, blockOtherUserId: data.otherUserId, blockServiceType: ServiceType.MEETING});
      return {block: true};
    }
  }

  @get('/block-users')
  @secured(SecuredType.IS_AUTHENTICATED)
  async blockUserList() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const blockList = await this.blockUserRepository.find({
      where: {blockUserId: currentUser.userId, blockServiceType: ServiceType.MEETING},
      order: ['createdAt desc'],
      include: [{
        relation: 'blockOtherUser',
        scope: {
          include: [{relation: 'meetingProfile'}],
        },
      }],
    });
    return blockList.map((v) => ({
      isOnline: false,
      userId: v.blockOtherUser?.id,
      meetingProfileId: v.blockOtherUser?.meetingProfileId,
      profile: v.blockOtherUser?.meetingProfile?.meetingPhotoMain,
      meetingNickname: v.blockOtherUser?.meetingProfile?.meetingNickname,
      meetingJob: v.blockOtherUser?.meetingProfile?.meetingJob,
      meetingOtherMeeting: v.blockOtherUser?.meetingProfile?.meetingOtherMeeting,
      meetingResidence: v.blockOtherUser?.meetingProfile?.meetingResidence,
    }));
  }

  @post('/block-phones')
  @secured(SecuredType.IS_AUTHENTICATED)
  async blockPhoneChange(
    @requestBody() data: {phoneList: {name: string, phone: string}[]}
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    await this.blockPhoneRepository.deleteAll({blockPhoneUserId: currentUser.userId});
    await this.blockPhoneRepository.createAll(data.phoneList.map((v) => ({
      blockPhoneUserId: currentUser.userId, blockPhoneName: v.name, blockPhoneNum: v.phone, blockPhoneServiceType: ServiceType.MEETING
    })));
  }

  @get('/block-phones')
  @secured(SecuredType.IS_AUTHENTICATED)
  async blockPhoneList() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const blockPhoneList = await this.blockPhoneRepository.find({where: {blockPhoneUserId: currentUser.userId, blockPhoneServiceType: ServiceType.MEETING}});
    return blockPhoneList.map((v) => v.blockPhoneNum);
  }

}
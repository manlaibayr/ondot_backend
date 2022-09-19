import {repository} from '@loopback/repository';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {BlockPhoneRepository, BlockUserRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {get, param, post, requestBody} from '@loopback/rest';
import {LearningProfileType, ServiceType, UserCredentials} from '../types';

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
    @requestBody() data: {otherUserId: string, serviceType: ServiceType},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const blockInfo = await this.blockUserRepository.findOne({where: {blockUserId: currentUser.userId, blockOtherUserId: data.otherUserId, blockServiceType: data.serviceType}});
    if (blockInfo) {
      await this.blockUserRepository.deleteById(blockInfo.id);
      return {block: false};
    } else {
      await this.blockUserRepository.create({blockUserId: currentUser.userId, blockOtherUserId: data.otherUserId, blockServiceType: data.serviceType});
      return {block: true};
    }
  }

  @get('/block-users')
  @secured(SecuredType.IS_AUTHENTICATED)
  async blockUserList(
    @param.query.string('serviceType') serviceType: ServiceType,
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const blockList = await this.blockUserRepository.find({
      where: {blockUserId: currentUser.userId, blockServiceType: serviceType},
      order: ['createdAt desc'],
      include: [{relation: (serviceType === ServiceType.MEETING ? 'blockMeetingProfile' : (serviceType === ServiceType.HOBBY ? 'blockHobbyProfile' : 'blockLearningProfile'))}],
    });
    return blockList.map((v) => {
      const item: any = {
        isOnline: false,
        blockId: v.id,
        userId: v.blockOtherUserId,
        profileId: serviceType === ServiceType.MEETING ? v.blockMeetingProfile?.id : (serviceType === ServiceType.HOBBY ? v.blockHobbyProfile?.id : v.blockLearningProfile?.id),
        profile: serviceType === ServiceType.MEETING ? v.blockMeetingProfile?.meetingPhotoMain : (serviceType === ServiceType.HOBBY ? v.blockHobbyProfile?.hobbyPhoto : v.blockLearningProfile?.tchProfileMainPhoto),
        nickname: serviceType === ServiceType.MEETING ? v.blockMeetingProfile?.meetingNickname : (serviceType === ServiceType.HOBBY ? v.blockHobbyProfile?.hobbyNickname : v.blockLearningProfile?.learningNickname),
        desc: '',
      }
      if(serviceType === ServiceType.MEETING) {
        item.desc = `${v.blockMeetingProfile?.meetingJob} • ${v.blockMeetingProfile?.meetingOtherMeeting} • ${v.blockMeetingProfile?.meetingResidence?.split(" ")[0]}`;
      } else if(serviceType === ServiceType.HOBBY) {
        item.desc = v.blockHobbyProfile?.hobbyResidence;
      } else if(serviceType === ServiceType.LEARNING) {
        item.learningProfileType = v.blockLearningProfile?.learningProfileType;
        if(v.blockLearningProfile?.learningProfileType === LearningProfileType.STUDENT) {
          item.desc = `${v.blockLearningProfile?.stuStatus} • ${v.blockLearningProfile?.sex}`;
          item.stuStatus = v.blockLearningProfile?.stuStatus;
          item.sex = v.blockLearningProfile?.sex;
        } else {
          item.desc = `선생님 • ${v.blockLearningProfile?.sex}`;
        }
      }
    });
  }

  @post('/block-phones')
  @secured(SecuredType.IS_AUTHENTICATED)
  async blockPhoneChange(
    @requestBody() data: {phoneList: {name: string, phone: string}[]},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    await this.blockPhoneRepository.deleteAll({blockPhoneUserId: currentUser.userId});
    await this.blockPhoneRepository.createAll(data.phoneList.map((v) => ({
      blockPhoneUserId: currentUser.userId, blockPhoneName: v.name, blockPhoneNum: v.phone, blockPhoneServiceType: ServiceType.MEETING,
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

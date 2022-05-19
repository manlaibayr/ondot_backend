import {repository,} from '@loopback/repository';
import {HttpErrors, post, requestBody} from '@loopback/rest';
import {Note} from '../models';
import {FlowerHistoryRepository, MeetingProfileRepository, NoteRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {ServiceType, UserCredentials} from '../types';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';

export class NoteController {
  constructor(
    @repository(NoteRepository) public noteRepository : NoteRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(MeetingProfileRepository) public meetingProfileRepository: MeetingProfileRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {}

  @post('/notes/send')
  @secured(SecuredType.IS_AUTHENTICATED)
  async sendNote(
    @requestBody() data: {otherId: string, text: string},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const noteFlower = 2;
    const myInfo = await this.userRepository.findById(currentUser.userId);
    if(myInfo.userFlower < noteFlower) {
      throw new HttpErrors.BadRequest('플라워가 충분하지 않습니다.');
    }
    const otherUserMeetingInfo = await this.meetingProfileRepository.findOne({where: {userId: data.otherId}});
    await this.userRepository.updateById(currentUser.userId, {userFlower: myInfo.userFlower - noteFlower});
    await this.flowerHistoryRepository.create({
      flowerUserId: currentUser.userId,
      flowerContent: otherUserMeetingInfo?.meetingNickname + '님에게 쪽지를 보냈습니다.',
      flowerValue: -noteFlower,
    });
    return this.noteRepository.create({
      noteUserId: currentUser.userId,
      noteOtherUserId: data.otherId,
      noteMsg: data.text
    });
  }
}

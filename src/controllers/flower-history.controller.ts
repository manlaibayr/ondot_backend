import {Filter, repository} from '@loopback/repository';
import {param, get} from '@loopback/rest';
import {FlowerHistory} from '../models';
import {FlowerHistoryRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {UserCredentials} from '../types';

export class FlowerHistoryController {
  constructor(
    @repository(FlowerHistoryRepository) public flowerHistoryRepository : FlowerHistoryRepository,
    @repository(UserRepository) public userRepository : UserRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {}

  @get('/flower-histories/info')
  @secured(SecuredType.IS_AUTHENTICATED)
  async historyInfo() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const userInfo = await this.userRepository.findById(currentUser.userId);
    const flowerHistory = await this.flowerHistoryRepository.find({where: {flowerUserId: currentUser.userId}, order: ['createdAt desc']});
    return {
      userFlower: userInfo.userFlower,
      flowerHistory: flowerHistory.map((v) => ({content: v.flowerContent, value: v.flowerValue, createdAt: v.createdAt})),
    }
  }
}

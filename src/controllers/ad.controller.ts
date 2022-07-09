// import {inject} from '@loopback/core';


import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param} from '@loopback/rest';
import {AdHistoryRepository, AdRepository, FlowerHistoryRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {UserCredentials} from '../types';

export class AdController {
  constructor(
    @repository(UserRepository) private userRepository: UserRepository,
    @repository(AdRepository) public adRepository: AdRepository,
    @repository(AdHistoryRepository) public adHistoryRepository: AdHistoryRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @get('/ads')
  @secured(SecuredType.IS_AUTHENTICATED)
  async findAd(
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const adList = await this.adRepository.find({where: {adShow: true}, order: ['adPosition asc']});
    const adHistoryList = await this.adHistoryRepository.find({where: {adHistoryUserId: currentUser.userId}});
    return adList.map((ad) => ({
      ...ad,
      allowAd: adHistoryList.filter((h) => h.adHistoryAdId === ad.id).length < ad.adTryCount
    }));
  }

  @get('/ads/view')
  @secured(SecuredType.IS_AUTHENTICATED)
  async viewAd(
    @param.query.string('id') id: string
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const [userInfo, adInfo, adHistoryCount] = await Promise.all([
      this.userRepository.findById(currentUser.userId),
      this.adRepository.findById(id),
      this.adHistoryRepository.count({adHistoryAdId: id, adHistoryUserId: currentUser.userId})
    ]);
    if(adHistoryCount.count >= adInfo.adTryCount) throw new HttpErrors.BadRequest('플라워를 받을수 없습니다.');
    await this.userRepository.updateById(currentUser.userId, {freeFlower: userInfo.freeFlower + adInfo.adFlower});
    await this.flowerHistoryRepository.create({flowerUserId: currentUser.userId, flowerContent: '무료 충전 광고열람보상', flowerValue: adInfo.adFlower, isFreeFlower: true});
    await this.adHistoryRepository.create({adHistoryUserId: currentUser.userId, adHistoryAdId: id, adHistoryFlower: adInfo.adFlower});
    return {flower: adInfo.adFlower};
  }

}

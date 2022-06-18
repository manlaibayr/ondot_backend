import {get, param, response} from '@loopback/rest';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {secured, SecuredType} from '../role-authentication';
import {RankingType, ServiceType} from '../types';
import {Filter, repository} from '@loopback/repository';
import {RankingUser} from '../models';
import {RankingUserRepository} from '../repositories';

export class RankingUserController {
  constructor(
    @repository(RankingUserRepository) private rankingUserRepository: RankingUserRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {}


  //*========== admin functions ==========*//
  @get('/ranking-users')
  @secured(SecuredType.HAS_ROLES, ['ADMIN'])
  @response(200, {
    description: 'Array of User model instances',
  })
  async userList(
    @param.query.object('search') searchParam: {userSex?: boolean, show?: boolean, serviceType: ServiceType, rankingType: RankingType},
  ) {
    const filter: Filter<RankingUser> = {order: ['rankingValue desc']};
    filter.where = {rankingType: searchParam.rankingType, rankingServiceType: searchParam.serviceType};
    if(searchParam.show !== undefined) filter.where.rankingShow = searchParam.show;
    filter.include = [{relation: 'user'}]
    if(searchParam.serviceType === ServiceType.MEETING) {
      filter.include.push({relation: 'meetingProfile'});
    } else if(searchParam.serviceType === ServiceType.HOBBY) {
      filter.include.push({relation: 'hobbyProfile'});
    }
    filter.limit = 100;
    const data = await this.rankingUserRepository.find(filter);
    return data.map((r) => ({
      userId: r.rankingUserId,
      username: r.user?.username,
      nickname: r.meetingProfile?.meetingNickname || r.hobbyProfile?.hobbyNickname,
      birthday: r.user?.birthday,
      sex: r.user?.sex,
      rankingValue: r.rankingValue,
      show: r.rankingShow
    }))
    return data;
  }
}

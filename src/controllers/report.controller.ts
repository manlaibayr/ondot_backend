import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {Count, Filter, repository} from '@loopback/repository';
import {get, param, post, requestBody} from '@loopback/rest';
import {ReportRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {RankingType, ReportType, ServiceType, UserCredentials} from '../types';
import {Report} from '../models';

export class ReportController {
  constructor(
    @repository(ReportRepository) public reportRepository: ReportRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @post('/reports')
  @secured(SecuredType.IS_AUTHENTICATED)
  async reportAdd(
    @requestBody() data: {otherUserId: string, reportType: ReportType, reportText: string},
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return this.reportRepository.create({
      reportUserId: currentUser.userId, reportOtherUserId: data.otherUserId, reportType: data.reportType, reportText: data.reportText, reportServiceType: ServiceType.MEETING,
    });
  }

  //*========== admin functions ==========*//
  @get('/reports')
  @secured(SecuredType.HAS_ROLES, ['ADMIN'])
  async reportList(
    @param.query.number('page') page: number,
    @param.query.number('count') pageCount: number,
    @param.query.object('search') searchParam: {serviceType?: ServiceType, date?: string},
  ) {
    const filter: Filter<Report> = {order: ['createdAt desc']};
    filter.where = {};
    if(searchParam.serviceType) filter.where.reportServiceType = searchParam.serviceType;

    const totalCount: Count = await this.reportRepository.count(filter.where);
    filter.skip = (page - 1) * pageCount;
    filter.limit = pageCount;
    filter.include = [{relation: 'user'}, {relation: 'otherUser'}];
    const list = await this.reportRepository.find(filter);
    const data = list.map((v) => ({
      userId: v.reportUserId,
      username: v.user?.username,
      otherUserId: v.reportOtherUserId,
      otherUsername: v.otherUser?.username,
      serviceType: v.reportServiceType,
      reportType: v.reportType,
      reportText: v.reportText,
      createdAt: v.createdAt,
    }));
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

  @get('/reports/third-list')
  @secured(SecuredType.HAS_ROLES, ['ADMIN'])
  async reportThirdList(
    @param.query.object('search') searchParam: {name?: string},
  ) {
    const result = await this.reportRepository.execute(`select userId, count from (select reportOtherUserId as userId, count(reportOtherUserId) as count from report GROUP BY reportOtherUserId) as t WHERE t.count >= 3`);
    const users = await this.userRepository.find({where: {id: {inq: result.map((v: any) => v.userId)}}});
    return result.map((v: any) => {
      const userInfo = users.find((u) => u.id === v.userId);
      return {
        userId: v.userId,
        count: v.count,
        username: userInfo?.username
      }
    })
  }

}

import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {repository} from '@loopback/repository';
import {post, requestBody} from '@loopback/rest';
import {ReportRepository, UserRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';
import {ReportType, ServiceType, UserCredentials} from '../types';

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
    @requestBody() data: {otherUserId: string, reportType: ReportType, reportText: string}
  ) {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    return this.reportRepository.create({
      reportUserId: currentUser.userId, reportOtherUserId: data.otherUserId, reportType: data.reportType, reportText: data.reportText, reportServiceType: ServiceType.MEETING,
    });
  }
}

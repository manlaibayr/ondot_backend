import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyProfile, MeetingProfile, Notification, NotificationRelations} from '../models';
import {MeetingProfileRepository} from './meeting-profile.repository';
import {HobbyProfileRepository} from './hobby-profile.repository';

export class NotificationRepository extends DefaultCrudRepository< Notification, typeof Notification.prototype.id, NotificationRelations> {

  public readonly senderMeetingProfile: HasOneRepositoryFactory<MeetingProfile, typeof MeetingProfile.prototype.id>
  public readonly senderHobbyProfile: HasOneRepositoryFactory<HobbyProfile, typeof HobbyProfile.prototype.id>

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('MeetingProfileRepository') protected meetingProfileRepositoryGetter: Getter<MeetingProfileRepository>,
    @repository.getter('HobbyProfileRepository') protected hobbyProfileRepositoryGetter: Getter<HobbyProfileRepository>,
  ) {
    super(Notification, dataSource);
    this.senderMeetingProfile = this.createHasOneRepositoryFactoryFor('senderMeetingProfile', meetingProfileRepositoryGetter)
    this.registerInclusionResolver('senderMeetingProfile', this.senderMeetingProfile.inclusionResolver);
    this.senderHobbyProfile = this.createHasOneRepositoryFactoryFor('senderHobbyProfile', hobbyProfileRepositoryGetter)
    this.registerInclusionResolver('senderHobbyProfile', this.senderHobbyProfile.inclusionResolver);
  }
}

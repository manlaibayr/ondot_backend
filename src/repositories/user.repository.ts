import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, HasManyRepositoryFactory, HasOneRepositoryFactory} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {User, UserRelations, Rolemapping, MeetingProfile} from '../models';
import {RolemappingRepository} from './rolemapping.repository';
import {MeetingProfileRepository} from './meeting-profile.repository';

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {

  public readonly rolemapping: HasManyRepositoryFactory<Rolemapping, typeof User.prototype.id>;
  public readonly meetingProfile: HasOneRepositoryFactory<MeetingProfile, typeof MeetingProfile.prototype.id>

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('RolemappingRepository') protected rolemappingRepositoryGetter: Getter<RolemappingRepository>,
    @repository.getter('MeetingProfileRepository') protected meetingProfileRepositoryGetter: Getter<MeetingProfileRepository>,
  ) {
    super(User, dataSource);
    this.rolemapping = this.createHasManyRepositoryFactoryFor('rolemapping', rolemappingRepositoryGetter,);
    this.registerInclusionResolver('rolemapping', this.rolemapping.inclusionResolver);
    this.meetingProfile = this.createHasOneRepositoryFactoryFor('meetingProfile', meetingProfileRepositoryGetter)
    this.registerInclusionResolver('meetingProfile', this.meetingProfile.inclusionResolver);
  }
}

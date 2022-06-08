import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, HasManyRepositoryFactory, HasOneRepositoryFactory} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {User, UserRelations, Rolemapping, MeetingProfile, HobbyProfile} from '../models';
import {RolemappingRepository} from './rolemapping.repository';
import {MeetingProfileRepository} from './meeting-profile.repository';
import {HobbyProfileRepository} from './hobby-profile.repository';

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {

  public readonly rolemapping: HasManyRepositoryFactory<Rolemapping, typeof User.prototype.id>;
  public readonly meetingProfile: HasOneRepositoryFactory<MeetingProfile, typeof MeetingProfile.prototype.id>
  public readonly hobbyProfile: HasOneRepositoryFactory<HobbyProfile, typeof HobbyProfile.prototype.id>

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('RolemappingRepository') protected rolemappingRepositoryGetter: Getter<RolemappingRepository>,
    @repository.getter('MeetingProfileRepository') protected meetingProfileRepositoryGetter: Getter<MeetingProfileRepository>,
    @repository.getter('HobbyProfileRepository') protected hobbyProfileRepositoryGetter: Getter<HobbyProfileRepository>,
  ) {
    super(User, dataSource);
    this.rolemapping = this.createHasManyRepositoryFactoryFor('rolemapping', rolemappingRepositoryGetter,);
    this.registerInclusionResolver('rolemapping', this.rolemapping.inclusionResolver);
    this.meetingProfile = this.createHasOneRepositoryFactoryFor('meetingProfile', meetingProfileRepositoryGetter)
    this.registerInclusionResolver('meetingProfile', this.meetingProfile.inclusionResolver);
    this.hobbyProfile = this.createHasOneRepositoryFactoryFor('hobbyProfile', hobbyProfileRepositoryGetter)
    this.registerInclusionResolver('hobbyProfile', this.hobbyProfile.inclusionResolver);
  }
}

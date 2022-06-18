import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyProfile, MeetingProfile, RankingUser, RankingUserRelations, User} from '../models';
import {UserRepository} from './user.repository';
import {HobbyProfileRepository} from './hobby-profile.repository';
import {MeetingProfileRepository} from './meeting-profile.repository';

export class RankingUserRepository extends DefaultCrudRepository<
  RankingUser,
  typeof RankingUser.prototype.id,
  RankingUserRelations
> {

  public readonly user: BelongsToAccessor<User, typeof RankingUser.prototype.id>;
  public readonly meetingProfile: HasOneRepositoryFactory<MeetingProfile, typeof MeetingProfile.prototype.id>
  public readonly hobbyProfile: HasOneRepositoryFactory<HobbyProfile, typeof HobbyProfile.prototype.id>

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('MeetingProfileRepository') protected meetingProfileRepositoryGetter: Getter<MeetingProfileRepository>,
    @repository.getter('HobbyProfileRepository') protected hobbyProfileRepositoryGetter: Getter<HobbyProfileRepository>,
  ) {
    super(RankingUser, dataSource);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
    this.meetingProfile = this.createHasOneRepositoryFactoryFor('meetingProfile', meetingProfileRepositoryGetter)
    this.registerInclusionResolver('meetingProfile', this.meetingProfile.inclusionResolver);
    this.hobbyProfile = this.createHasOneRepositoryFactoryFor('hobbyProfile', hobbyProfileRepositoryGetter)
    this.registerInclusionResolver('hobbyProfile', this.hobbyProfile.inclusionResolver);
  }
}

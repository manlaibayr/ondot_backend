import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyRoom, MeetingProfile, RankingUser, RankingUserRelations, User} from '../models';
import {UserRepository} from './user.repository';
import {MeetingProfileRepository} from './meeting-profile.repository';
import {HobbyRoomRepository} from './hobby-room.repository';

export class RankingUserRepository extends DefaultCrudRepository<
  RankingUser,
  typeof RankingUser.prototype.id,
  RankingUserRelations
> {

  public readonly user: BelongsToAccessor<User, typeof RankingUser.prototype.id>;
  public readonly meetingProfile: HasOneRepositoryFactory<MeetingProfile, typeof MeetingProfile.prototype.id>
  public readonly hobbyRoom: HasOneRepositoryFactory<HobbyRoom, typeof HobbyRoom.prototype.id>

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('MeetingProfileRepository') protected meetingProfileRepositoryGetter: Getter<MeetingProfileRepository>,
    @repository.getter('HobbyRoomRepository') protected hobbyRoomRepositoryGetter: Getter<HobbyRoomRepository>,
  ) {
    super(RankingUser, dataSource);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
    this.meetingProfile = this.createHasOneRepositoryFactoryFor('meetingProfile', meetingProfileRepositoryGetter)
    this.registerInclusionResolver('meetingProfile', this.meetingProfile.inclusionResolver);
    this.hobbyRoom = this.createHasOneRepositoryFactoryFor('hobbyRoom', hobbyRoomRepositoryGetter)
    this.registerInclusionResolver('hobbyRoom', this.hobbyRoom.inclusionResolver);
  }
}

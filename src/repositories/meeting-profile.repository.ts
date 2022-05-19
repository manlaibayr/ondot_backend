import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {MeetingProfile, MeetingProfileRelations, User} from '../models';
import {UserRepository} from './user.repository';

export class MeetingProfileRepository extends DefaultCrudRepository<
  MeetingProfile,
  typeof MeetingProfile.prototype.id,
  MeetingProfileRelations
> {

  public readonly user: BelongsToAccessor<User, typeof MeetingProfile.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(MeetingProfile, dataSource);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}

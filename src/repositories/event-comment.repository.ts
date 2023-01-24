import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {EventComment, EventCommentRelations, HobbyProfile, User} from '../models';
import {UserRepository} from './user.repository';

export class EventCommentRepository extends DefaultCrudRepository<
  EventComment,
  typeof EventComment.prototype.id,
  EventCommentRelations
> {
  public readonly user: BelongsToAccessor<User, typeof HobbyProfile.prototype.id>;
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(EventComment, dataSource);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}

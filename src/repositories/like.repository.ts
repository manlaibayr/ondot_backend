import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Like, LikeRelations, User} from '../models';
import {UserRepository} from './user.repository';

export class LikeRepository extends DefaultCrudRepository<
  Like,
  typeof Like.prototype.id,
  LikeRelations
> {

  public readonly likeUser: BelongsToAccessor<User, typeof Like.prototype.id>;
  public readonly likeOtherUser: BelongsToAccessor<User, typeof Like.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(Like, dataSource);
    this.likeUser = this.createBelongsToAccessorFor('likeUser', userRepositoryGetter,);
    this.registerInclusionResolver('likeUser', this.likeUser.inclusionResolver);
    this.likeOtherUser = this.createBelongsToAccessorFor('likeOtherUser', userRepositoryGetter,);
    this.registerInclusionResolver('likeOtherUser', this.likeOtherUser.inclusionResolver);
  }
}

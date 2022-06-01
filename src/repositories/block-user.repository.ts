import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {BlockUser, BlockUserRelations, User} from '../models';
import {UserRepository} from './user.repository';

export class BlockUserRepository extends DefaultCrudRepository<
  BlockUser,
  typeof BlockUser.prototype.id,
  BlockUserRelations
> {

  public readonly blockOtherUser: BelongsToAccessor<User, typeof BlockUser.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(BlockUser, dataSource);
    this.blockOtherUser = this.createBelongsToAccessorFor('blockOtherUser', userRepositoryGetter,);
    this.registerInclusionResolver('blockOtherUser', this.blockOtherUser.inclusionResolver);
  }
}

import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyProfile, HobbyProfileRelations, User} from '../models';
import {UserRepository} from './user.repository';

export class HobbyProfileRepository extends DefaultCrudRepository<
  HobbyProfile,
  typeof HobbyProfile.prototype.id,
  HobbyProfileRelations
> {

  public readonly user: BelongsToAccessor<User, typeof HobbyProfile.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(HobbyProfile, dataSource);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}

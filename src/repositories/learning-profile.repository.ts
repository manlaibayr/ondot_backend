import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LearningProfile, LearningProfileRelations, User} from '../models';
import {UserRepository} from './user.repository';

export class LearningProfileRepository extends DefaultCrudRepository<
  LearningProfile,
  typeof LearningProfile.prototype.id,
  LearningProfileRelations
> {

  public readonly user: BelongsToAccessor<User, typeof LearningProfile.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(LearningProfile, dataSource);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}

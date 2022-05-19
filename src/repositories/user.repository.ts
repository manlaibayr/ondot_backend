import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, HasManyRepositoryFactory} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {User, UserRelations, Rolemapping} from '../models';
import {RolemappingRepository} from './rolemapping.repository';

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {

  public readonly rolemapping: HasManyRepositoryFactory<Rolemapping, typeof User.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('RolemappingRepository') protected rolemappingRepositoryGetter: Getter<RolemappingRepository>,
  ) {
    super(User, dataSource);
    this.rolemapping = this.createHasManyRepositoryFactoryFor('rolemapping', rolemappingRepositoryGetter,);
    this.registerInclusionResolver('rolemapping', this.rolemapping.inclusionResolver);
  }
}

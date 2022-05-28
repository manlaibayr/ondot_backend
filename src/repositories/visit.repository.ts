import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {User, Visit, VisitRelations} from '../models';
import {UserRepository} from './user.repository';

export class VisitRepository extends DefaultCrudRepository<
  Visit,
  typeof Visit.prototype.id,
  VisitRelations
> {

  public readonly visitUser: BelongsToAccessor<User, typeof Visit.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(Visit, dataSource);
    this.visitUser = this.createBelongsToAccessorFor('visitUser', userRepositoryGetter,);
    this.registerInclusionResolver('visitUser', this.visitUser.inclusionResolver);
  }
}

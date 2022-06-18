import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Report, ReportRelations, User} from '../models';
import {UserRepository} from './user.repository';

export class ReportRepository extends DefaultCrudRepository<
  Report,
  typeof Report.prototype.id,
  ReportRelations
> {

  public readonly user: BelongsToAccessor<User, typeof Report.prototype.id>;
  public readonly otherUser: BelongsToAccessor<User, typeof Report.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(Report, dataSource);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
    this.otherUser = this.createBelongsToAccessorFor('otherUser', userRepositoryGetter,);
    this.registerInclusionResolver('otherUser', this.otherUser.inclusionResolver);
  }
}

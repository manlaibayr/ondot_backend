import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {UsagePass, UsagePassRelations} from '../models';

export class UsagePassRepository extends DefaultCrudRepository<
  UsagePass,
  typeof UsagePass.prototype.id,
  UsagePassRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(UsagePass, dataSource);
  }
}

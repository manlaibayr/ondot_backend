import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {RefereeLog, RefereeLogRelations} from '../models';
import {DbDataSource} from '../datasources';

export class RefereeLogRepository extends DefaultCrudRepository<
  RefereeLog,
  typeof RefereeLog.prototype.refereeLogUserId,
  RefereeLogRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(RefereeLog, dataSource);
  }
}

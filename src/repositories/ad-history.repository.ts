import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {AdHistory, AdHistoryRelations} from '../models';

export class AdHistoryRepository extends DefaultCrudRepository<
  AdHistory,
  typeof AdHistory.prototype.id,
  AdHistoryRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(AdHistory, dataSource);
  }
}

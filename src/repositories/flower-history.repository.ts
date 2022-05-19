import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {FlowerHistory, FlowerHistoryRelations} from '../models';

export class FlowerHistoryRepository extends DefaultCrudRepository<
  FlowerHistory,
  typeof FlowerHistory.prototype.id,
  FlowerHistoryRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(FlowerHistory, dataSource);
  }
}

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {GiftHistory, GiftHistoryRelations} from '../models';

export class GiftHistoryRepository extends DefaultCrudRepository<
  GiftHistory,
  typeof GiftHistory.prototype.id,
  GiftHistoryRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(GiftHistory, dataSource);
  }
}

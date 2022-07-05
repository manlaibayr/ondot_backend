import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {ChargeHistory, ChargeHistoryRelations} from '../models';

export class ChargeHistoryRepository extends DefaultCrudRepository<
  ChargeHistory,
  typeof ChargeHistory.prototype.id,
  ChargeHistoryRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(ChargeHistory, dataSource);
  }
}

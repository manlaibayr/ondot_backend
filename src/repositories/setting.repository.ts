import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Setting, SettingRelations} from '../models';

export class SettingRepository extends DefaultCrudRepository<
  Setting,
  typeof Setting.prototype.id,
  SettingRelations
  > {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Setting, dataSource);
  }
}

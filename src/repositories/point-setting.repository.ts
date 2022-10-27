import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {PointSetting, PointSettingRelations} from '../models';

export class PointSettingRepository extends DefaultCrudRepository<
  PointSetting,
  typeof PointSetting.prototype.id,
  PointSettingRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(PointSetting, dataSource);
  }
}

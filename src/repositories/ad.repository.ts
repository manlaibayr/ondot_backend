import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Ad, AdRelations} from '../models';

export class AdRepository extends DefaultCrudRepository<
  Ad,
  typeof Ad.prototype.id,
  AdRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Ad, dataSource);
  }
}

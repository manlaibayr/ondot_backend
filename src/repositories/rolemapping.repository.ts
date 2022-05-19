import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Rolemapping, RolemappingRelations} from '../models';

export class RolemappingRepository extends DefaultCrudRepository<
  Rolemapping,
  typeof Rolemapping.prototype.id,
  RolemappingRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Rolemapping, dataSource);
  }
}

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyCategory, HobbyCategoryRelations} from '../models';

export class HobbyCategoryRepository extends DefaultCrudRepository<
  HobbyCategory,
  typeof HobbyCategory.prototype.id,
  HobbyCategoryRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(HobbyCategory, dataSource);
  }
}

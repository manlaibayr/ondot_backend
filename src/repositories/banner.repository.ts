import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Banner, BannerRelations} from '../models';

export class BannerRepository extends DefaultCrudRepository<
  Banner,
  typeof Banner.prototype.id,
  BannerRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Banner, dataSource);
  }
}

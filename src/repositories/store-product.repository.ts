import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {StoreProduct, StoreProductRelations} from '../models';

export class StoreProductRepository extends DefaultCrudRepository<
  StoreProduct,
  typeof StoreProduct.prototype.id,
  StoreProductRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(StoreProduct, dataSource);
  }
}

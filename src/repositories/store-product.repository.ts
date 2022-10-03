import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {Error: bad inputDataSource} from '../datasources';
import {StoreProduct, StoreProductRelations} from '../models';

export class StoreProductRepository extends DefaultCrudRepository<
  StoreProduct,
  typeof StoreProduct.prototype.id,
  StoreProductRelations
> {
  constructor(
    @inject('datasources.') dataSource: Error: bad inputDataSource,
  ) {
    super(StoreProduct, dataSource);
  }
}

import {Filter, repository} from '@loopback/repository';
import {param, get} from '@loopback/rest';
import {StoreProduct} from '../models';
import {StoreProductRepository} from '../repositories';
import {ServiceType, StoreProductType} from '../types';

export class StoreProductController {
  constructor(
    @repository(StoreProductRepository) public storeProductRepository: StoreProductRepository,
  ) {
  }

  @get('/store-products')
  async find(
    @param.query.string('productType') productType?: StoreProductType,
    @param.query.string('serviceType') serviceType?: ServiceType,
  ) {
    const filter: Filter<StoreProduct> = {};
    filter.where = {productStatus: true};
    if(productType) filter.where.productType = productType;
    if(serviceType) filter.where.productServiceType = serviceType;
    filter.order = ['productServiceType asc', 'productPrice asc'];
    filter.fields = ['id', 'productType', 'productServiceType', 'productName', 'productFlower', 'productPeriodOfDay', 'productPrice'];
    return this.storeProductRepository.find(filter);
  }
}

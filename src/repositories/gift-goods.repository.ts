import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {GiftGoods, GiftGoodsRelations} from '../models';

export class GiftGoodsRepository extends DefaultCrudRepository<
  GiftGoods,
  typeof GiftGoods.prototype.goods_id,
  GiftGoodsRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(GiftGoods, dataSource);
  }
}

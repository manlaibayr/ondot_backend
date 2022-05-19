import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Like, LikeRelations} from '../models';

export class LikeRepository extends DefaultCrudRepository<
  Like,
  typeof Like.prototype.id,
  LikeRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Like, dataSource);
  }
}

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {BlockPhone, BlockPhoneRelations} from '../models';

export class BlockPhoneRepository extends DefaultCrudRepository<
  BlockPhone,
  typeof BlockPhone.prototype.id,
  BlockPhoneRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(BlockPhone, dataSource);
  }
}

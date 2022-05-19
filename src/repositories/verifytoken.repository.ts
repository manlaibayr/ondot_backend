import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Verifytoken, VerifytokenRelations} from '../models';

export class VerifytokenRepository extends DefaultCrudRepository<
  Verifytoken,
  typeof Verifytoken.prototype.id,
  VerifytokenRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Verifytoken, dataSource);
  }
}

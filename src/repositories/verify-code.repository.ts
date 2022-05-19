import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {VerifyCode, VerifyCodeRelations} from '../models';

export class VerifyCodeRepository extends DefaultCrudRepository<
  VerifyCode,
  typeof VerifyCode.prototype.id,
  VerifyCodeRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(VerifyCode, dataSource);
  }
}

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Faq, FaqRelations} from '../models';

export class FaqRepository extends DefaultCrudRepository<
  Faq,
  typeof Faq.prototype.id,
  FaqRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Faq, dataSource);
  }
}

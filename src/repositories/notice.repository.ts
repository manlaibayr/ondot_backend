import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Notice, NoticeRelations} from '../models';

export class NoticeRepository extends DefaultCrudRepository<Notice, typeof Notice.prototype.id, NoticeRelations> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Notice, dataSource);
  }
}

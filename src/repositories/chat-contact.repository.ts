import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {ChatContact, ChatContactRelations} from '../models';

export class ChatContactRepository extends DefaultCrudRepository<
  ChatContact,
  typeof ChatContact.prototype.id,
  ChatContactRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(ChatContact, dataSource);
  }
}

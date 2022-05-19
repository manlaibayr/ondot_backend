import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {ChatMsg, ChatMsgRelations} from '../models';

export class ChatMsgRepository extends DefaultCrudRepository<
  ChatMsg,
  typeof ChatMsg.prototype.id,
  ChatMsgRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(ChatMsg, dataSource);
  }
}

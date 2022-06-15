import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyRoomDibs, HobbyRoomDibsRelations} from '../models';

export class HobbyRoomDibsRepository extends DefaultCrudRepository<
  HobbyRoomDibs,
  typeof HobbyRoomDibs.prototype.id,
  HobbyRoomDibsRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(HobbyRoomDibs, dataSource);
  }
}

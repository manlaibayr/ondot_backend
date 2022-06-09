import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyRoomBoard, HobbyRoomBoardRelations} from '../models';

export class HobbyRoomBoardRepository extends DefaultCrudRepository<
  HobbyRoomBoard,
  typeof HobbyRoomBoard.prototype.id,
  HobbyRoomBoardRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(HobbyRoomBoard, dataSource);
  }
}

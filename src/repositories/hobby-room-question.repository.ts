import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyRoomQuestion, HobbyRoomQuestionRelations} from '../models';

export class HobbyRoomQuestionRepository extends DefaultCrudRepository<
  HobbyRoomQuestion,
  typeof HobbyRoomQuestion.prototype.id,
  HobbyRoomQuestionRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(HobbyRoomQuestion, dataSource);
  }
}

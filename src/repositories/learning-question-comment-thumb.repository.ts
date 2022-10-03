import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LearningQuestionCommentThumb, LearningQuestionCommentThumbRelations} from '../models';

export class LearningQuestionCommentThumbRepository extends DefaultCrudRepository<
  LearningQuestionCommentThumb,
  typeof LearningQuestionCommentThumb.prototype.id,
  LearningQuestionCommentThumbRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(LearningQuestionCommentThumb, dataSource);
  }
}

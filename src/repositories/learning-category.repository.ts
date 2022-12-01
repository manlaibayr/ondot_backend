import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LearningCategory, LearningCategoryRelations} from '../models';

export class LearningCategoryRepository extends DefaultCrudRepository<
  LearningCategory,
  typeof LearningCategory.prototype.id,
  LearningCategoryRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(LearningCategory, dataSource);
  }
}

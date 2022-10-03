import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LearningDibs, LearningProfile, LearningQuestionComment, LearningQuestionCommentRelations} from '../models';
import {LearningProfileRepository} from './learning-profile.repository';

export class LearningQuestionCommentRepository extends DefaultCrudRepository<
  LearningQuestionComment,
  typeof LearningQuestionComment.prototype.id,
  LearningQuestionCommentRelations
> {

  public readonly commentUserProfile: HasOneRepositoryFactory<LearningProfile, typeof LearningQuestionComment.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('LearningProfileRepository') protected learningProfileRepositoryGetter: Getter<LearningProfileRepository>,
  ) {
    super(LearningQuestionComment, dataSource);
    this.commentUserProfile = this.createHasOneRepositoryFactoryFor('commentUserProfile', learningProfileRepositoryGetter,);
    this.registerInclusionResolver('commentUserProfile', this.commentUserProfile.inclusionResolver);
  }
}

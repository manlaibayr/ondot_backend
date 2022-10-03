import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, HasManyRepositoryFactory, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LearningDibs, LearningProfile, LearningQuestion, LearningQuestionComment, LearningQuestionRelations, LearningReview} from '../models';
import {LearningProfileRepository} from './learning-profile.repository';
import {LearningQuestionCommentRepository} from './learning-question-comment.repository';

export class LearningQuestionRepository extends DefaultCrudRepository<
  LearningQuestion,
  typeof LearningQuestion.prototype.id,
  LearningQuestionRelations
> {

  public readonly questionUserProfile: HasOneRepositoryFactory<LearningProfile, typeof LearningDibs.prototype.id>;
  public readonly questionComments: HasManyRepositoryFactory<LearningQuestionComment, typeof LearningDibs.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('LearningProfileRepository') protected learningProfileRepositoryGetter: Getter<LearningProfileRepository>,
    @repository.getter('LearningQuestionCommentRepository') protected LearningQuestionCommentRepositoryGetter: Getter<LearningQuestionCommentRepository>,
  ) {
    super(LearningQuestion, dataSource);
    this.questionUserProfile = this.createHasOneRepositoryFactoryFor('questionUserProfile', learningProfileRepositoryGetter,);
    this.registerInclusionResolver('questionUserProfile', this.questionUserProfile.inclusionResolver);
    this.questionComments = this.createHasManyRepositoryFactoryFor('questionComments', LearningQuestionCommentRepositoryGetter,);
    this.registerInclusionResolver('questionComments', this.questionComments.inclusionResolver);
  }
}

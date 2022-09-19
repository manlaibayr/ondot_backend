import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LearningDibs, LearningProfile, LearningReview, LearningReviewRelations} from '../models';
import {LearningProfileRepository} from './learning-profile.repository';

export class LearningReviewRepository extends DefaultCrudRepository<
  LearningReview,
  typeof LearningReview.prototype.id,
  LearningReviewRelations
> {

  public readonly studentProfile: BelongsToAccessor<LearningProfile, typeof LearningReview.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('LearningProfileRepository') protected learningProfileRepositoryGetter: Getter<LearningProfileRepository>,
  ) {
    super(LearningReview, dataSource);
    this.studentProfile = this.createBelongsToAccessorFor('studentProfile', learningProfileRepositoryGetter,);
    this.registerInclusionResolver('studentProfile', this.studentProfile.inclusionResolver);
  }
}

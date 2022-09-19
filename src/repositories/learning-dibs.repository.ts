import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LearningDibs, LearningDibsRelations, LearningProfile} from '../models';
import {LearningProfileRepository} from './learning-profile.repository';

export class LearningDibsRepository extends DefaultCrudRepository<
  LearningDibs,
  typeof LearningDibs.prototype.id,
  LearningDibsRelations
> {

  public readonly dibsTargetProfile: BelongsToAccessor<LearningProfile, typeof LearningDibs.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('LearningProfileRepository') protected learningProfileRepositoryGetter: Getter<LearningProfileRepository>,
  ) {
    super(LearningDibs, dataSource);
    this.dibsTargetProfile = this.createBelongsToAccessorFor('dibsTargetProfile', learningProfileRepositoryGetter,);
    this.registerInclusionResolver('dibsTargetProfile', this.dibsTargetProfile.inclusionResolver);
  }
}

import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LearningDibs, LearningDibsRelations, LearningProfile} from '../models';
import {LearningProfileRepository} from './learning-profile.repository';

export class LearningDibsRepository extends DefaultCrudRepository<
  LearningDibs,
  typeof LearningDibs.prototype.id,
  LearningDibsRelations
> {

  public readonly dibsUserProfile: HasOneRepositoryFactory<LearningProfile, typeof LearningDibs.prototype.id>;
  public readonly dibsTargetUserProfile: HasOneRepositoryFactory<LearningProfile, typeof LearningDibs.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('LearningProfileRepository') protected learningProfileRepositoryGetter: Getter<LearningProfileRepository>,
  ) {
    super(LearningDibs, dataSource);
    this.dibsUserProfile = this.createHasOneRepositoryFactoryFor('dibsUserProfile', learningProfileRepositoryGetter,);
    this.registerInclusionResolver('dibsUserProfile', this.dibsUserProfile.inclusionResolver);
    this.dibsTargetUserProfile = this.createHasOneRepositoryFactoryFor('dibsTargetUserProfile', learningProfileRepositoryGetter,);
    this.registerInclusionResolver('dibsTargetUserProfile', this.dibsTargetUserProfile.inclusionResolver);
  }
}

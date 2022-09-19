import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {BlockUser, BlockUserRelations, HobbyProfile, LearningProfile, MeetingProfile} from '../models';
import {UserRepository} from './user.repository';
import {MeetingProfileRepository} from './meeting-profile.repository';
import {HobbyProfileRepository} from './hobby-profile.repository';
import {LearningProfileRepository} from './learning-profile.repository';

export class BlockUserRepository extends DefaultCrudRepository<
  BlockUser,
  typeof BlockUser.prototype.id,
  BlockUserRelations
> {

  public readonly blockMeetingProfile: HasOneRepositoryFactory<MeetingProfile, typeof MeetingProfile.prototype.id>
  public readonly blockHobbyProfile: HasOneRepositoryFactory<HobbyProfile, typeof HobbyProfile.prototype.id>
  public readonly blockLearningProfile: HasOneRepositoryFactory<LearningProfile, typeof LearningProfile.prototype.id>

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('MeetingProfileRepository') protected meetingProfileRepositoryGetter: Getter<MeetingProfileRepository>,
    @repository.getter('HobbyProfileRepository') protected hobbyProfileRepositoryGetter: Getter<HobbyProfileRepository>,
    @repository.getter('LearningProfileRepository') protected learningProfileRepositoryGetter: Getter<LearningProfileRepository>,
  ) {
    super(BlockUser, dataSource);
    this.blockMeetingProfile = this.createHasOneRepositoryFactoryFor('blockMeetingProfile', meetingProfileRepositoryGetter)
    this.registerInclusionResolver('blockMeetingProfile', this.blockMeetingProfile.inclusionResolver);
    this.blockHobbyProfile = this.createHasOneRepositoryFactoryFor('blockHobbyProfile', hobbyProfileRepositoryGetter)
    this.registerInclusionResolver('blockHobbyProfile', this.blockHobbyProfile.inclusionResolver);
    this.blockLearningProfile = this.createHasOneRepositoryFactoryFor('blockLearningProfile', learningProfileRepositoryGetter)
    this.registerInclusionResolver('blockLearningProfile', this.blockLearningProfile.inclusionResolver);
  }
}

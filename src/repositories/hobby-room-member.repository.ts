import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyProfile, HobbyRoomMember, HobbyRoomMemberRelations} from '../models';
import {HobbyProfileRepository} from './hobby-profile.repository';

export class HobbyRoomMemberRepository extends DefaultCrudRepository<
  HobbyRoomMember,
  typeof HobbyRoomMember.prototype.id,
  HobbyRoomMemberRelations
> {
  public readonly hobbyProfile: HasOneRepositoryFactory<HobbyProfile, typeof HobbyProfile.prototype.id>

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('HobbyProfileRepository') protected hobbyProfileRepositoryGetter: Getter<HobbyProfileRepository>,
  ) {
    super(HobbyRoomMember, dataSource);
    this.hobbyProfile = this.createHasOneRepositoryFactoryFor('hobbyProfile', hobbyProfileRepositoryGetter)
    this.registerInclusionResolver('hobbyProfile', this.hobbyProfile.inclusionResolver);
  }
}

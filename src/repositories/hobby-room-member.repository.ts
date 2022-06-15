import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyProfile, HobbyRoom, HobbyRoomMember, HobbyRoomMemberRelations} from '../models';
import {HobbyProfileRepository} from './hobby-profile.repository';
import {HobbyRoomRepository} from './hobby-room.repository';

export class HobbyRoomMemberRepository extends DefaultCrudRepository<
  HobbyRoomMember,
  typeof HobbyRoomMember.prototype.id,
  HobbyRoomMemberRelations
> {

  public readonly hobbyProfile: HasOneRepositoryFactory<HobbyProfile, typeof HobbyProfile.prototype.id>
  public readonly hobbyRoom: BelongsToAccessor<HobbyRoom, typeof HobbyRoomMember.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('HobbyProfileRepository') protected hobbyProfileRepositoryGetter: Getter<HobbyProfileRepository>,
    @repository.getter('HobbyRoomRepository') protected hobbyRoomRepositoryGetter: Getter<HobbyRoomRepository>,
  ) {
    super(HobbyRoomMember, dataSource);
    this.hobbyProfile = this.createHasOneRepositoryFactoryFor('hobbyProfile', hobbyProfileRepositoryGetter)
    this.registerInclusionResolver('hobbyProfile', this.hobbyProfile.inclusionResolver);
    this.hobbyRoom = this.createBelongsToAccessorFor('hobbyRoom', hobbyRoomRepositoryGetter)
    this.registerInclusionResolver('hobbyRoom', this.hobbyRoom.inclusionResolver);
  }
}

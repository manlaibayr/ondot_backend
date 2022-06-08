import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasManyRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyRoom, HobbyRoomMember, HobbyRoomRelations} from '../models';
import {HobbyRoomMemberRepository} from './hobby-room-member.repository';

export class HobbyRoomRepository extends DefaultCrudRepository<
  HobbyRoom,
  typeof HobbyRoom.prototype.id,
  HobbyRoomRelations
> {

  public readonly roomMembers: HasManyRepositoryFactory<HobbyRoomMember, typeof HobbyRoom.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('HobbyRoomMemberRepository') protected HobbyRoomMemberRepositoryGetter: Getter<HobbyRoomMemberRepository>,
  ) {
    super(HobbyRoom, dataSource);
    this.roomMembers = this.createHasManyRepositoryFactoryFor('roomMembers', HobbyRoomMemberRepositoryGetter,);
    this.registerInclusionResolver('roomMembers', this.roomMembers.inclusionResolver);
  }
}

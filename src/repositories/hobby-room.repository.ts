import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, HasManyRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyRoom, HobbyRoomBoard, HobbyRoomDibs, HobbyRoomMember, HobbyRoomRelations, RankingUser, User} from '../models';
import {HobbyRoomMemberRepository} from './hobby-room-member.repository';
import {HobbyRoomBoardRepository} from './hobby-room-board.repository';
import {UserRepository} from './user.repository';
import {HobbyRoomDibsRepository} from './hobby-room-dibs.repository';

export class HobbyRoomRepository extends DefaultCrudRepository<
  HobbyRoom,
  typeof HobbyRoom.prototype.id,
  HobbyRoomRelations
> {

  public readonly user: BelongsToAccessor<User, typeof RankingUser.prototype.id>;
  public readonly roomMembers: HasManyRepositoryFactory<HobbyRoomMember, typeof HobbyRoom.prototype.id>;
  public readonly roomBoards: HasManyRepositoryFactory<HobbyRoomBoard, typeof HobbyRoom.prototype.id>;
  public readonly roomDibs: HasManyRepositoryFactory<HobbyRoomDibs, typeof HobbyRoom.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('HobbyRoomMemberRepository') protected HobbyRoomMemberRepositoryGetter: Getter<HobbyRoomMemberRepository>,
    @repository.getter('HobbyRoomBoardRepository') protected HobbyRoomBoardRepositoryGetter: Getter<HobbyRoomBoardRepository>,
    @repository.getter('HobbyRoomDibsRepository') protected HobbyRoomDibsRepositoryGetter: Getter<HobbyRoomDibsRepository>,
  ) {
    super(HobbyRoom, dataSource);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter,);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
    this.roomMembers = this.createHasManyRepositoryFactoryFor('roomMembers', HobbyRoomMemberRepositoryGetter,);
    this.registerInclusionResolver('roomMembers', this.roomMembers.inclusionResolver);
    this.roomBoards = this.createHasManyRepositoryFactoryFor('roomBoards', HobbyRoomBoardRepositoryGetter,);
    this.registerInclusionResolver('roomBoards', this.roomBoards.inclusionResolver);
    this.roomDibs = this.createHasManyRepositoryFactoryFor('roomDibs', HobbyRoomDibsRepositoryGetter,);
    this.registerInclusionResolver('roomDibs', this.roomDibs.inclusionResolver);
  }
}

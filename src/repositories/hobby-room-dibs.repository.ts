import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {HobbyRoom, HobbyRoomDibs, HobbyRoomDibsRelations} from '../models';
import {HobbyRoomRepository} from './hobby-room.repository';

export class HobbyRoomDibsRepository extends DefaultCrudRepository<
  HobbyRoomDibs,
  typeof HobbyRoomDibs.prototype.id,
  HobbyRoomDibsRelations
> {

  public readonly hobbyRoom: BelongsToAccessor<HobbyRoom, typeof HobbyRoomDibs.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('HobbyRoomRepository') protected hobbyRoomRepositoryGetter: Getter<HobbyRoomRepository>,
  ) {
    super(HobbyRoomDibs, dataSource);
    this.hobbyRoom = this.createBelongsToAccessorFor('hobbyRoom', hobbyRoomRepositoryGetter)
    this.registerInclusionResolver('hobbyRoom', this.hobbyRoom.inclusionResolver);
  }
}

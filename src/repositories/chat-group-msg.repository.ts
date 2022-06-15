import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {ChatGroupMsg, ChatGroupMsgRelations, HobbyProfile} from '../models';
import {HobbyProfileRepository} from './hobby-profile.repository';

export class ChatGroupMsgRepository extends DefaultCrudRepository<
  ChatGroupMsg,
  typeof ChatGroupMsg.prototype.id,
  ChatGroupMsgRelations
> {

  public readonly hobbyProfile: HasOneRepositoryFactory<HobbyProfile, typeof HobbyProfile.prototype.id>

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('HobbyProfileRepository') protected hobbyProfileRepositoryGetter: Getter<HobbyProfileRepository>,
  ) {
    super(ChatGroupMsg, dataSource);
    this.hobbyProfile = this.createHasOneRepositoryFactoryFor('hobbyProfile', hobbyProfileRepositoryGetter)
    this.registerInclusionResolver('hobbyProfile', this.hobbyProfile.inclusionResolver);
  }
}

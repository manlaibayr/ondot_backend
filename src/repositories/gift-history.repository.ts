import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {GiftHistory, GiftHistoryRelations, User} from '../models';
import {UserRepository} from './user.repository';

export class GiftHistoryRepository extends DefaultCrudRepository<
  GiftHistory,
  typeof GiftHistory.prototype.id,
  GiftHistoryRelations
> {

  public readonly senderUser: HasOneRepositoryFactory<User, typeof User.prototype.id>
  public readonly receiverUser: HasOneRepositoryFactory<User, typeof User.prototype.id>

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(GiftHistory, dataSource);
    this.senderUser = this.createHasOneRepositoryFactoryFor('senderUser', userRepositoryGetter)
    this.registerInclusionResolver('senderUser', this.senderUser.inclusionResolver);
    this.receiverUser = this.createHasOneRepositoryFactoryFor('receiverUser', userRepositoryGetter)
    this.registerInclusionResolver('receiverUser', this.receiverUser.inclusionResolver);
  }
}

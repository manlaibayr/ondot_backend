import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasManyRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Event, EventComment, EventRelations} from '../models';
import {EventCommentRepository} from './event-comment.repository';

export class EventRepository extends DefaultCrudRepository<
  Event,
  typeof Event.prototype.id,
  EventRelations
> {

  public readonly eventComments: HasManyRepositoryFactory<EventComment, typeof Event.prototype.id>
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('EventCommentRepository') protected eventCommentRepositoryGetter: Getter<EventCommentRepository>,
  ) {
    super(Event, dataSource);
    this.eventComments = this.createHasManyRepositoryFactoryFor('eventComments', eventCommentRepositoryGetter,);
    this.registerInclusionResolver('eventComments', this.eventComments.inclusionResolver);
  }
}

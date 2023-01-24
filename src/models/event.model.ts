import {Entity, hasMany, model, property} from '@loopback/repository';
import {EventComment} from './event-comment.model';

@model()
export class Event extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  eventTitle: string;

  @property({
    type: 'string',
  })
  eventContent?: string;

  @property({
    type: 'date',
  })
  eventStartDate?: Date;

  @property({
    type: 'date',
  })
  eventEndDate?: Date;

  @property({
    type: 'boolean',
    default: true,
  })
  eventIsShow?: boolean;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;

  @hasMany<EventComment>(() => EventComment, {keyTo: 'eventCommentEventId'})
  eventComments?: EventComment[];

  constructor(data?: Partial<Event>) {
    super(data);
  }
}

export interface EventRelations {
  // describe navigational properties here
  eventComments?: EventComment[];
}

export type EventWithRelations = Event & EventRelations;

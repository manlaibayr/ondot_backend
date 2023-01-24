import {belongsTo, Entity, hasOne, model, property} from '@loopback/repository';
import {User} from './user.model';

@model({settings: {mysql: {table: 'event_comment'}}})
export class EventComment extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => User, {keyTo: 'eventCommentUserId', name: 'user'})
  eventCommentUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  eventCommentEventId: string;

  @property({
    type: 'string',
  })
  eventCommentText?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<EventComment>) {
    super(data);
  }
}

export interface EventCommentRelations {
  // describe navigational properties here
  user?: User;
}

export type EventCommentWithRelations = EventComment & EventCommentRelations;

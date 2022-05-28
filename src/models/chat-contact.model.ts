import {Entity, model, property} from '@loopback/repository';
import {ContactStatus, ServiceType} from '../types';

@model({settings: {mysql: {table: 'chat_contact'}}})
export class ChatContact extends Entity {
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
  contactUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  contactOtherUserId: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ContactStatus),
    },
  })
  contactStatus: ContactStatus;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ContactStatus),
    },
  })
  contactOtherStatus: ContactStatus;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ServiceType),
    },
  })
  contactServiceType: ServiceType;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<ChatContact>) {
    super(data);
  }
}

export interface ChatContactRelations {
  // describe navigational properties here
}

export type MeetingChatListWithRelations = ChatContact & ChatContactRelations;

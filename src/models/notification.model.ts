import {Entity, model, property} from '@loopback/repository';
import {ServiceType} from '../types';

@model()
export class Notification extends Entity {
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
  notificationSendUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  notificationReceiveUserId: string;

  @property({
    type: 'string',
  })
  notificationMsg?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ServiceType),
    },
  })
  notificationServiceType: ServiceType;

  @property({
    type: 'boolean',
    default: false
  })
  notificationShow: boolean;

  @property({
    type: 'boolean',
    default: false
  })
  notificationDelete: boolean;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<Notification>) {
    super(data);
  }
}

export interface NotificationRelations {
  // describe navigational properties here
}

export type NotificationWithRelations = Notification & NotificationRelations;

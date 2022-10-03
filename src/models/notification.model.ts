import {Entity, hasOne, model, property} from '@loopback/repository';
import {NotificationType, ServiceType} from '../types';
import {MeetingProfile} from './meeting-profile.model';
import {HobbyProfile} from './hobby-profile.model';
import {LearningProfile} from './learning-profile.model';

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
      enum: Object.values(NotificationType),
    },
  })
  notificationType: NotificationType;

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
    type: 'string',
  })
  notificationDesc?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;

  @hasOne(() => MeetingProfile, {keyTo: 'userId', keyFrom: 'notificationSendUserId'})
  senderMeetingProfile?: MeetingProfile;

  @hasOne(() => HobbyProfile, {keyTo: 'userId', keyFrom: 'notificationSendUserId'})
  senderHobbyProfile?: HobbyProfile;

  @hasOne(() => LearningProfile, {keyTo: 'userId', keyFrom: 'notificationSendUserId'})
  senderLearningProfile?: LearningProfile;

  constructor(data?: Partial<Notification>) {
    super(data);
  }
}

export interface NotificationRelations {
  // describe navigational properties here
  senderMeetingProfile?: MeetingProfile,
  senderHobbyProfile?: HobbyProfile;
  senderLearningProfile?: LearningProfile,
}

export type NotificationWithRelations = Notification & NotificationRelations;

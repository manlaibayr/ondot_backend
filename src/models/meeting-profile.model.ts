import {belongsTo, Entity, model, property} from '@loopback/repository';
import {User, UserWithRelations} from './user.model';

@model({settings: {mysql: {table: 'meeting_profile'}}})
export class MeetingProfile extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => User, {keyTo: 'userId', name: 'user'})
  userId: string;

  @property({
    type: 'string',
  })
  meetingOtherSex?: string;

  @property({
    type: 'string',
  })
  meetingNickname?: string;

  @property({
    type: 'string',
  })
  meetingResidence?: string;

  @property({
    type: 'number',
  })
  meetingHeight?: number;

  @property({
    type: 'string',
  })
  meetingBodyType?: string;

  @property({
    type: 'string',
  })
  meetingPersonality?: string;

  @property({
    type: 'string',
  })
  meetingJob?: string;

  @property({
    type: 'string',
  })
  meetingEducation?: string;

  @property({
    type: 'string',
  })
  meetingBloodType?: string;

  @property({
    type: 'string',
  })
  meetingSmoking?: string;

  @property({
    type: 'string',
  })
  meetingDrinking?: string;

  @property({
    type: 'string',
  })
  meetingReligion?: string;

  @property({
    type: 'string',
  })
  meetingInterest?: string;

  @property({
    type: 'string',
  })
  meetingPhotoMain?: string;

  @property({
    type: 'string',
  })
  meetingPhotoSecond?: string;

  @property({
    type: 'string',
  })
  meetingPhotoAdditional?: string;

  @property({
    type: 'string',
  })
  meetingOtherMeeting?: string;

  @property({
    type: 'number',
  })
  meetingOtherStartAge?: number;

  @property({
    type: 'number',
  })
  meetingOtherEndAge?: number;

  @property({
    type: 'string',
  })
  meetingOtherResidence?: string;

  @property({
    type: 'number',
  })
  meetingOtherStartHeight?: number;

  @property({
    type: 'number',
  })
  meetingOtherEndHeight?: number;

  @property({
    type: 'string',
  })
  meetingOtherBodyType?: string;

  @property({
    type: 'string',
  })
  meetingOtherPersonality?: string;

  @property({
    type: 'string',
  })
  meetingOtherSmoking?: string;

  @property({
    type: 'string',
  })
  meetingOneLineIntro?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  updatedAt?: Date;


  constructor(data?: Partial<MeetingProfile>) {
    super(data);
  }
}

export interface MeetingProfileRelations {
  // describe navigational properties here
  user: UserWithRelations;
}

export type MeetingProfileWithRelations = MeetingProfile & MeetingProfileRelations;

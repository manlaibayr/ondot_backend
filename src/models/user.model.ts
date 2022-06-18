import {Entity, hasMany, hasOne, model, property} from '@loopback/repository';
import {Rolemapping} from './rolemapping.model';
import {UserType, SignupType, UserStatusType} from '../types';
import {MeetingProfile} from './meeting-profile.model';
import {HobbyProfile} from './hobby-profile.model';

@model()
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
  })
  username?: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @property({
    type: 'string',
  })
  email?: string;

  @property({
    type: 'boolean',
  })
  sex?: boolean;

  @property({
    type: 'string',
  })
  birthday?: string;

  @property({
    type: 'number',
  })
  age?: number;

  @property({
    type: 'boolean',
  })
  isForeign?: boolean;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(SignupType),
    },
  })
  signupType: string;

  @property({
    type: 'string',
  })
  phoneNumber?: string;

  @property({
    type: 'string',
  })
  refereeEmail?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(UserType),
    },
  })
  userType: UserType;

  @property({
    type: 'boolean',
    default: true,
  })
  isPushAllow?: boolean;

  @property({
    type: 'string',
  })
  pushToken?: string;

  @property({
    type: 'number',
    default: 1000,
  })
  userFlower: number;

  @property({
    type: 'string'
  })
  meetingProfileId?: string;

  @property({
    type: 'string'
  })
  hobbyProfileId?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(UserStatusType),
    },
  })
  userStatus?: UserStatusType;

  @property({
    type: 'date',
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;

  @hasMany<Rolemapping>(() => Rolemapping, {keyTo: 'user_id'})
  rolemapping?: Rolemapping[];

  @hasOne(() => MeetingProfile, {keyTo: 'userId'})
  meetingProfile?: MeetingProfile;

  @hasOne(() => HobbyProfile, {keyTo: 'userId'})
  hobbyProfile?: HobbyProfile;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
  rolemapping?: Rolemapping[];
  meetingProfile?: MeetingProfile;
  hobbyProfile? : HobbyProfile;
}

export type UserWithRelations = User & UserRelations;

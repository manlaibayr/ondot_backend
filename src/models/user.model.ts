import {Entity, hasMany, model, property} from '@loopback/repository';
import {Rolemapping} from './rolemapping.model';
import {UserType, SignupType} from '../types';

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
    default: 100,
  })
  userFlower: number;

  @property({
    type: 'string'
  })
  meetingProfileId?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;

  @hasMany<Rolemapping>(() => Rolemapping, {keyTo: 'user_id'})
  rolemapping?: Rolemapping[];

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
  rolemapping?: Rolemapping[];
}

export type UserWithRelations = User & UserRelations;

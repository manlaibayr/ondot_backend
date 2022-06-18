import {belongsTo, Entity, hasOne, model, property} from '@loopback/repository';
import {RankingType, ServiceType} from '../types';
import {User, UserWithRelations} from './user.model';
import {HobbyProfile} from './hobby-profile.model';
import {MeetingProfile} from './meeting-profile.model';

@model({settings: {mysql: {table: 'ranking_user'}}})
export class RankingUser extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => User, {keyTo: 'rankingUserId', name: 'user'})
  rankingUserId: string;

  @property({
    type: 'number',
    required: true,
  })
  rankingValue: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ServiceType)
    }
  })
  rankingServiceType: ServiceType;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(RankingType)
    }
  })
  rankingType: RankingType;

  @property({
    type: 'string',
    required: true,
  })
  rankingDate: string;

  @property({
    type: 'boolean',
    default: true
  })
  rankingShow: boolean;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;

  @hasOne(() => MeetingProfile, {keyTo: 'userId', keyFrom: 'rankingUserId'})
  meetingProfile?: MeetingProfile;

  @hasOne(() => HobbyProfile, {keyTo: 'userId', keyFrom: 'rankingUserId'})
  hobbyProfile?: HobbyProfile;

  constructor(data?: Partial<RankingUser>) {
    super(data);
  }
}

export interface RankingUserRelations {
  // describe navigational properties here
  user?: UserWithRelations;
  meetingProfile?: MeetingProfile,
  hobbyProfile?: HobbyProfile;
}

export type RankingUserWithRelations = RankingUser & RankingUserRelations;

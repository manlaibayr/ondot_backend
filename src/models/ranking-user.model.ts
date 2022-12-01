import {belongsTo, Entity, hasOne, model, property} from '@loopback/repository';
import {RankingType, ServiceType} from '../types';
import {User, UserWithRelations} from './user.model';
import {HobbyProfile} from './hobby-profile.model';
import {MeetingProfile} from './meeting-profile.model';
import {HobbyRoom} from './hobby-room.model';

@model({settings: {mysql: {table: 'ranking_user'}}})
export class RankingUser extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => User, {keyTo: 'rankingUserId', name: 'user'})
  rankingUserId?: string;

  @belongsTo(() => HobbyRoom, {keyTo: 'rankingHobbyRoomId', name: 'hobbyRoom'})
  rankingHobbyRoomId?: string;

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
  })
  rankingSex?: boolean;

  @property({
    type: 'boolean',
    default: true
  })
  rankingShow: boolean;

  @property({
    type: 'number',
    default: 0
  })
  rankingAdminAdd: number;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;

  @hasOne(() => MeetingProfile, {keyTo: 'userId', keyFrom: 'rankingUserId'})
  meetingProfile?: MeetingProfile;

  @hasOne(() => HobbyRoom, { keyTo: 'id', keyFrom: 'rankingHobbyRoomId'})
  hobbyRoom?: HobbyRoom;

  constructor(data?: Partial<RankingUser>) {
    super(data);
  }
}

export interface RankingUserRelations {
  // describe navigational properties here
  user?: UserWithRelations;
  meetingProfile?: MeetingProfile,
  hobbyRoom?: HobbyRoom;
}

export type RankingUserWithRelations = RankingUser & RankingUserRelations;

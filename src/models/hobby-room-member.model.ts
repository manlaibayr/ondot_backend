import {Entity, hasOne, model, property} from '@loopback/repository';
import {RoomMemberJoinType, RoomRoleType} from '../types';
import {HobbyProfile} from './hobby-profile.model';

@model({settings: {mysql: {table: 'hobby_room_member'}}})
export class HobbyRoomMember extends Entity {
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
  roomId: string;

  @property({
    type: 'string',
    required: true,
  })
  memberUserId: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(RoomRoleType),
    },
  })
  memberRole: RoomRoleType;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(RoomMemberJoinType),
    },
  })
  memberJoinStatus: RoomMemberJoinType;

  @property({
    type: 'boolean',
    required: true,
    default: false,
  })
  memberIsAllow: boolean;

  @property({
    type: 'date'
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;

  @hasOne(() => HobbyProfile, {keyTo: 'userId', keyFrom: 'memberUserId'})
  hobbyProfile?: HobbyProfile;


  constructor(data?: Partial<HobbyRoomMember>) {
    super(data);
  }
}

export interface HobbyRoomMemberRelations {
  // describe navigational properties here
  hobbyProfile? : HobbyProfile;
}

export type HobbyRoomMemberWithRelations = HobbyRoomMember & HobbyRoomMemberRelations;

import {Entity, hasMany, hasOne, model, property} from '@loopback/repository';
import {HobbyRoomMember} from './hobby-room-member.model';
import {HobbyRoomBoard} from './hobby-room-board.model';

@model({settings: {mysql: {table: 'hobby_room'}}})
export class HobbyRoom extends Entity {
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
  userId: string;

  @property({
    type: 'string',
    required: true,
  })
  roomCategory: string;

  @property({
    type: 'string',
    required: true,
  })
  roomRegion: string;

  @property({
    type: 'string',
    required: true,
  })
  roomTitle: string;

  @property({
    type: 'string',
  })
  roomTarget?: string;

  @property({
    type: 'string',
  })
  roomTargetDesc?: string;

  @property({
    type: 'number',
  })
  roomStartAge?: number;

  @property({
    type: 'number',
  })
  roomEndAge?: number;

  @property({
    type: 'string',
    required: true,
  })
  roomPurpose: string;

  @property({
    type: 'string',
  })
  roomFeature?: string;

  @property({
    type: 'string',
  })
  roomCharm?: string;

  @property({
    type: 'date',
  })
  roomMeetingDate?: Date;

  @property({
    type: 'string',
  })
  roomMeetingLocation?: string;

  @property({
    type: 'boolean',
    default: true,
  })
  roomIsShow?: boolean;

  @property({
    type: 'number',
    required: true,
  })
  roomMaxUser: number;

  @property({
    type: 'number',
    default: 0,
  })
  roomPrice: number;

  @property({
    type: 'string',
  })
  roomDesc?: string;

  @property({
    type: 'boolean',
    default: true,
  })
  roomNeedAllow?: boolean;

  @property({
    type: 'string',
    required: true,
  })
  roomPhotoMain: string;

  @property({
    type: 'string',
    required: true,
  })
  roomPhotoSecond: string;

  @property({
    type: 'string',
  })
  roomPhotoAdditional?: string;

  @property({
    type: 'date'
  })
  roomExpiredDate: Date;

  @property({
    type: 'number',
    default: 1,
  })
  roomMemberNumber: number;

  @property({
    type: 'boolean',
    default: false,
  })
  isRoomDelete: boolean;

  @property({
    type: 'date'
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;

  @hasMany<HobbyRoomMember>(() => HobbyRoomMember, {keyTo: 'roomId'})
  roomMembers?: HobbyRoomMember[]

  @hasMany<HobbyRoomBoard>(() => HobbyRoomBoard, {keyTo: 'boardRoomId'})
  roomBoards?: HobbyRoomMember[]

  constructor(data?: Partial<HobbyRoom>) {
    super(data);
  }
}

export interface HobbyRoomRelations {
  // describe navigational properties here
  roomMembers?: HobbyRoomMember[];
  roomBoards?: HobbyRoomBoard[];
}

export type HobbyRoomWithRelations = HobbyRoom & HobbyRoomRelations;

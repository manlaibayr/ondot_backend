import {belongsTo, Entity, model, property} from '@loopback/repository';
import {HobbyRoom, HobbyRoomWithRelations} from './hobby-room.model';

@model({settings: {mysql: {table: 'hobby_room_dibs'}}})
export class HobbyRoomDibs extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => HobbyRoom, {keyTo: 'dibsRoomId', name: 'hobbyRoom'})
  dibsRoomId: string;

  @property({
    type: 'string',
    required: true,
  })
  dibsUserId: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<HobbyRoomDibs>) {
    super(data);
  }
}

export interface HobbyRoomDibsRelations {
  // describe navigational properties here
  hobbyRoom?: HobbyRoomWithRelations;
}

export type HobbyRoomDibsWithRelations = HobbyRoomDibs & HobbyRoomDibsRelations;

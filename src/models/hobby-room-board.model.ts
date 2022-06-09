import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'hobby_room_board'}}})
export class HobbyRoomBoard extends Entity {
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
  boardRoomId: string;

  @property({
    type: 'string',
    required: true,
  })
  boardUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  boardTitle: string;

  @property({
    type: 'string',
    required: true,
  })
  boardContent: string;

  @property({
    type: 'boolean',
    required: true,
  })
  boardIsPin: boolean;

  @property({
    type: 'date'
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<HobbyRoomBoard>) {
    super(data);
  }
}

export interface HobbyRoomBoardRelations {
  // describe navigational properties here
}

export type HobbyRoomBoardWithRelations = HobbyRoomBoard & HobbyRoomBoardRelations;

import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'hobby_room_question'}}})
export class HobbyRoomQuestion extends Entity {
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
  questionRoomId: string;

  @property({
    type: 'string',
    required: true,
  })
  questionAdminId: string;

  @property({
    type: 'string',
    required: true,
  })
  questionUserId: string;

  @property({
    type: 'string',
  })
  questionText?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<HobbyRoomQuestion>) {
    super(data);
  }
}

export interface HobbyRoomQuestionRelations {
  // describe navigational properties here
}

export type HobbyRoomQuestionWithRelations = HobbyRoomQuestion & HobbyRoomQuestionRelations;

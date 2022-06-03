import {Entity, model, property} from '@loopback/repository';

@model()
export class Note extends Entity {
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
  noteUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  noteOtherUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  noteMsg: string;

  @property({
    type: 'string',
  })
  noteAnswerMsg: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<Note>) {
    super(data);
  }
}

export interface NoteRelations {
  // describe navigational properties here
}

export type NoteWithRelations = Note & NoteRelations;

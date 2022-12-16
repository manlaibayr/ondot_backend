import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'referee_log'}}})
export class RefereeLog extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  refereeLogUserId?: string;

  @property({
    type: 'string',
    required: true,
  })
  refereeLogOtherUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  refereeLogIdValue: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<RefereeLog>) {
    super(data);
  }
}

export interface RefereeLogRelations {
  // describe navigational properties here
}

export type RefereeLogWithRelations = RefereeLog & RefereeLogRelations;

import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'charge_history'}}})
export class ChargeHistory extends Entity {
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
  chargeUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  impUid: string;

  @property({
    type: 'string',
    required: true,
  })
  merchantUid: string;

  @property({
    type: 'number',
    required: true,
  })
  chargeAmount: number;

  @property({
    type: 'number',
  })
  chargeFlower: number;

  @property({
    type: 'string',
  })
  chargeDesc?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<ChargeHistory>) {
    super(data);
  }
}

export interface ChargeHistoryRelations {
  // describe navigational properties here
}

export type ChargeHistoryWithRelations = ChargeHistory & ChargeHistoryRelations;

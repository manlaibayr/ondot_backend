import {Entity, model, property} from '@loopback/repository';
import {ChargeStatus} from '../types';

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
    type: 'string',
    required: true,
  })
  chargeMethod: string;

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
    type: 'string',
  })
  chargePhone?: string;

  @property({
    type: 'string',
  })
  chargeCardName?: string;

  @property({
    type: 'string',
  })
  chargeCardNumber?: string;

  @property({
    type: 'string',
  })
  chargeApplyNum?: string;

  @property({
    type: 'string',
    jsonSchema: {
      enum: Object.values(ChargeStatus)
    }
  })
  chargeStatus?: ChargeStatus;

  @property({
    type: 'date',
  })
  updatedAt?: Date;

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

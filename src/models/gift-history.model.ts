import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'gift_history'}}})
export class GiftHistory extends Entity {
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
  goodsId: string;

  @property({
    type: 'string',
    required: true,
  })
  giftSendUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  giftReceiveUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  goodsName: string;

  @property({
    type: 'number',
    required: true,
  })
  giftPrice: number;

  @property({
    type: 'number',
    required: true,
  })
  giftFlower: number;

  @property({
    type: 'string',
  })
  giftCtrId?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<GiftHistory>) {
    super(data);
  }
}

export interface GiftHistoryRelations {
  // describe navigational properties here
}

export type GiftHistoryWithRelations = GiftHistory & GiftHistoryRelations;

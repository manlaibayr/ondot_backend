import {Entity, hasOne, model, property} from '@loopback/repository';
import {User} from './user.model';

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

  @hasOne(() => User, {keyTo: 'id', keyFrom: 'giftSendUserId'})
  senderUser?: User;

  @hasOne(() => User, {keyTo: 'id', keyFrom: 'giftReceiveUserId'})
  receiverUser?: User;


  constructor(data?: Partial<GiftHistory>) {
    super(data);
  }
}

export interface GiftHistoryRelations {
  // describe navigational properties here
  senderUser?: User,
  receiverUser?: User;
}

export type GiftHistoryWithRelations = GiftHistory & GiftHistoryRelations;

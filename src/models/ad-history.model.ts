import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'ad_history'}}})
export class AdHistory extends Entity {
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
  adHistoryUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  adHistoryAdId: string;

  @property({
    type: 'number',
    required: true,
  })
  adHistoryFlower: number;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<AdHistory>) {
    super(data);
  }
}

export interface AdHistoryRelations {
  // describe navigational properties here
}

export type AdHistoryWithRelations = AdHistory & AdHistoryRelations;

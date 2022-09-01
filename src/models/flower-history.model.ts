import {Entity, model, property} from '@loopback/repository';
import {FlowerHistoryType} from '../types';

@model({settings: {mysql: {table: 'flower_history'}}})
export class FlowerHistory extends Entity {
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
  flowerUserId: string;

  @property({
    type: 'string',
  })
  flowerContent: string;

  @property({
    type: 'number',
    required: true,
  })
  flowerValue: number;

  @property({
    type: 'boolean',
    required: true,
    default: true,
  })
  isFreeFlower: boolean;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(FlowerHistoryType),
    },
  })
  flowerHistoryType: FlowerHistoryType;

  @property({
    type: 'string',
  })
  flowerHistoryRefer: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;


  constructor(data?: Partial<FlowerHistory>) {
    super(data);
  }
}

export interface FlowerHistoryRelations {
  // describe navigational properties here
}

export type FlowerHistoryWithRelations = FlowerHistory & FlowerHistoryRelations;

import {Entity, model, property} from '@loopback/repository';
import {AdType} from '../types';

@model()
export class Ad extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(AdType)
    }
  })
  adType?: AdType;

  @property({
    type: 'string',
  })
  adIcon?: string;

  @property({
    type: 'string',
    required: true,
  })
  adBrand: string;

  @property({
    type: 'string',
    required: true,
  })
  adLink: string;

  @property({
    type: 'string',
  })
  adText?: string;

  @property({
    type: 'number',
    required: true,
  })
  adFlower: number;

  @property({
    type: 'number',
    required: true,
  })
  adTryCount: number;

  @property({
    type: 'string',
    required: true,
  })
  adThumbnail: string;

  @property({
    type: 'number',
    required: true,
  })
  adPosition: number;

  @property({
    type: 'boolean',
    required: true,
  })
  adShow: boolean;

  @property({
    type: 'date',
    default: "$now"
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<Ad>) {
    super(data);
  }
}

export interface AdRelations {
  // describe navigational properties here
}

export type AdWithRelations = Ad & AdRelations;

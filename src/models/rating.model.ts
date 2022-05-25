import {Entity, model, property} from '@loopback/repository';
import {ServiceType} from '../types';

@model()
export class Rating extends Entity {
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
  ratingUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  ratingOtherUserId: string;

  @property({
    type: 'number',
    required: true,
  })
  ratingValue: number;

  @property({
    type: 'string'
  })
  ratingText?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ServiceType)
    }
  })
  ratingServiceType: ServiceType;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;


  constructor(data?: Partial<Rating>) {
    super(data);
  }
}

export interface RatingRelations {
  // describe navigational properties here
}

export type RatingWithRelations = Rating & RatingRelations;

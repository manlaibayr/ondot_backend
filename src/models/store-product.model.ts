import {Entity, model, property} from '@loopback/repository';
import {ServiceType, StoreProductType} from '../types';

@model({settings: {mysql: {table: 'store_product'}}})
export class StoreProduct extends Entity {
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
      enum: Object.values(StoreProductType),
    },
  })
  productType: StoreProductType;

  @property({
    type: 'string',
    jsonSchema: {
      enum: Object.values(ServiceType),
    },
  })
  productServiceType?: ServiceType;

  @property({
    type: 'string',
    required: true,
  })
  productName: string;

  @property({
    type: 'number',
    required: true,
  })
  productPeriodOfDay: number;

  @property({
    type: 'number',
    required: true,
  })
  productFlower: number;

  @property({
    type: 'number',
    required: true,
  })
  productPrice: number;

  @property({
    type: 'number',
  })
  productDiscountedPrice?: number;

  @property({
    type: 'boolean',
    default: false,
  })
  productIsDiscounted?: boolean;

  @property({
    type: 'boolean',
    default: true,
  })
  productStatus?: boolean;

  @property({
    type: 'date',
  })
  updatedAt?: Date;

  @property({
    type: 'date',
  })
  createdAt?: string;


  constructor(data?: Partial<StoreProduct>) {
    super(data);
  }
}

export interface StoreProductRelations {
  // describe navigational properties here
}

export type StoreProductWithRelations = StoreProduct & StoreProductRelations;

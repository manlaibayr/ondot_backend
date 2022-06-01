import {Entity, model, property} from '@loopback/repository';
import {ServiceType} from '../types';

@model({settings: {mysql: {table: 'block_phone'}}})
export class BlockPhone extends Entity {
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
  blockPhoneUserId: string;

  @property({
    type: 'string',
  })
  blockPhoneName?: string;

  @property({
    type: 'string',
    required: true,
  })
  blockPhoneNum: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ServiceType),
    },
  })
  blockPhoneServiceType: ServiceType;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<BlockPhone>) {
    super(data);
  }
}

export interface BlockPhoneRelations {
  // describe navigational properties here
}

export type BlockPhoneWithRelations = BlockPhone & BlockPhoneRelations;

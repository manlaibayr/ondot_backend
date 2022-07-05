import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'usage_pass'}}})
export class UsagePass extends Entity {
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
  passUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  passName: string;

  @property({
    type: 'string',
    required: true,
  })
  passServiceType: string;

  @property({
    type: 'date',
    required: true,
  })
  passStartDate: Date;

  @property({
    type: 'date',
    required: true,
  })
  passExpireDate: Date;

  @property({
    type: 'date',
    default: '$now',
  })
  createdAt?: Date;


  constructor(data?: Partial<UsagePass>) {
    super(data);
  }
}

export interface UsagePassRelations {
  // describe navigational properties here
}

export type UsagePassWithRelations = UsagePass & UsagePassRelations;

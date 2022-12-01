import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'hobby_category'}}})
export class HobbyCategory extends Entity {
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
  hobbyCategoryName: string;

  @property({
    type: 'string',
  })
  hobbyCategoryParentId?: string;

  @property({
    type: 'string',
  })
  hobbyCategoryImg?: string;

  @property({
    type: 'string',
  })
  hobbyCategoryActiveImg?: string;

  @property({
    type: 'number',
    required: true,
  })
  hobbyCategoryOrder: number;

  @property({
    type: 'date',
    default: "$now"
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;


  constructor(data?: Partial<HobbyCategory>) {
    super(data);
  }
}

export interface HobbyCategoryRelations {
  // describe navigational properties here
}

export type HobbyCategoryWithRelations = HobbyCategory & HobbyCategoryRelations;

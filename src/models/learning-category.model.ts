import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'learning_category'}}})
export class LearningCategory extends Entity {
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
  learningCategoryName: string;

  @property({
    type: 'string',
  })
  learningCategoryParentId?: string;

  @property({
    type: 'string',
  })
  learningCategoryActiveImg?: string;

  @property({
    type: 'string',
  })
  learningCategoryImg?: string;

  @property({
    type: 'number',
    required: true,
  })
  learningCategoryOrder: number;

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


  constructor(data?: Partial<LearningCategory>) {
    super(data);
  }
}

export interface LearningCategoryRelations {
  // describe navigational properties here
}

export type LearningCategoryWithRelations = LearningCategory & LearningCategoryRelations;

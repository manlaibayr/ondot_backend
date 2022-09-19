import {belongsTo, Entity, model, property} from '@loopback/repository';
import {LearningProfile, LearningProfileWithRelations} from './learning-profile.model';

@model({settings: {mysql: {table: 'learning_review'}}})
export class LearningReview extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => LearningProfile, {keyTo: 'userId', name: 'studentProfile'})
  reviewStudentUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  reviewTeacherUserId: string;

  @property({
    type: 'number',
  })
  reviewValue?: number;

  @property({
    type: 'string',
  })
  reviewContent?: string;

  @property({
    type: 'boolean',
    default: false,
  })
  reviewHideName: boolean;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<LearningReview>) {
    super(data);
  }
}

export interface LearningReviewRelations {
  // describe navigational properties here
  studentProfile: LearningProfileWithRelations;
}

export type LearningReviewWithRelations = LearningReview & LearningReviewRelations;

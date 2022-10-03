import {Entity, hasOne, model, property} from '@loopback/repository';
import {LearningProfile} from './learning-profile.model';

@model({settings: {mysql: {table: 'learning_question_comment'}}})
export class LearningQuestionComment extends Entity {
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
  commentUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  commentQuestionId: string;

  @property({
    type: 'string',
  })
  commentParentId?: string;

  @property({
    type: 'string',
    required: true,
  })
  commentContent: string;

  @property({
    type: 'number',
    default: 0,
  })
  commentThumbCount?: number;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;

  @hasOne(() => LearningProfile, {keyTo: 'userId', keyFrom: 'commentUserId'})
  commentUserProfile?: LearningProfile;


  constructor(data?: Partial<LearningQuestionComment>) {
    super(data);
  }
}

export interface LearningQuestionCommentRelations {
  // describe navigational properties here
  commentUserProfile?: LearningProfile
}

export type LearningQuestionCommentWithRelations = LearningQuestionComment & LearningQuestionCommentRelations;

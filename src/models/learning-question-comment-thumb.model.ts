import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'learning_question_comment_thumb'}}})
export class LearningQuestionCommentThumb extends Entity {
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
  thumbUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  thumbCommentId: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<LearningQuestionCommentThumb>) {
    super(data);
  }
}

export interface LearningQuestionCommentThumbRelations {
  // describe navigational properties here
}

export type LearningQuestionCommentThumbWithRelations = LearningQuestionCommentThumb & LearningQuestionCommentThumbRelations;

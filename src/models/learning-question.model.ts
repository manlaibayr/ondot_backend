import {Entity, hasMany, hasOne, model, property} from '@loopback/repository';
import {LearningProfile} from './learning-profile.model';
import {LearningQuestionComment} from './learning-question-comment.model';
import {HobbyRoomMember} from './hobby-room-member.model';

@model({settings: {mysql: {table: 'learning_question'}}})
export class LearningQuestion extends Entity {
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
  questionUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  questionTitle: string;

  @property({
    type: 'string',
    required: true,
  })
  questionContent: string;

  @property({
    type: 'number',
    default: 0,
  })
  questionCommentCount?: number;

  @property({
    type: 'date',
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;

  @hasOne(() => LearningProfile, {keyTo: 'userId', keyFrom: 'questionUserId'})
  questionUserProfile?: LearningProfile;

  @hasMany<LearningQuestionComment>(() => LearningQuestionComment, {keyTo: 'commentQuestionId'})
  questionComments?: LearningQuestionComment[]

  constructor(data?: Partial<LearningQuestion>) {
    super(data);
  }
}

export interface LearningQuestionRelations {
  // describe navigational properties here
  questionUserProfile?: LearningProfile;
  questionComments?: LearningQuestionComment[];
}

export type LearningQuestionWithRelations = LearningQuestion & LearningQuestionRelations;

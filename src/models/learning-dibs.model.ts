import {belongsTo, Entity, hasOne, model, property} from '@loopback/repository';
import {LearningProfile} from './learning-profile.model';

@model({settings: {mysql: {table: 'learning_dibs'}}})
export class LearningDibs extends Entity {
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
  dibsUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  dibsTargetUserId: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;

  @hasOne(() => LearningProfile, {keyTo: 'userId', keyFrom: 'dibsUserId'})
  dibsUserProfile?: LearningProfile;

  @hasOne(() => LearningProfile, {keyTo: 'userId', keyFrom: 'dibsTargetUserId'})
  dibsTargetUserProfile?: LearningProfile;

  constructor(data?: Partial<LearningDibs>) {
    super(data);
  }
}

export interface LearningDibsRelations {
  // describe navigational properties here
  dibsUserProfile?: LearningProfile;
  dibsTargetUserProfile?: LearningProfile;
}

export type LearningDibsWithRelations = LearningDibs & LearningDibsRelations;

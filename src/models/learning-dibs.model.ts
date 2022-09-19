import {belongsTo, Entity, model, property} from '@loopback/repository';
import {LearningProfile, LearningProfileWithRelations} from './learning-profile.model';

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

  @belongsTo(() => LearningProfile, {keyTo: 'userId', name: 'dibsTargetProfile'})
  dibsTargetUserId: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<LearningDibs>) {
    super(data);
  }
}

export interface LearningDibsRelations {
  // describe navigational properties here
  dibsTargetProfile: LearningProfileWithRelations;
}

export type LearningDibsWithRelations = LearningDibs & LearningDibsRelations;

import {belongsTo, Entity, model, property} from '@loopback/repository';
import {User, UserWithRelations} from './user.model';
import {LearningProfileType} from '../types';

@model({settings: {mysql: {table: 'learning_profile'}}})
export class LearningProfile extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => User, {keyTo: 'userId', name: 'user'})
  userId: string;

  @property({
    type: 'number',
  })
  age?: number;

  @property({
    type: 'string',
  })
  sex?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(LearningProfileType)
    }
  })
  learningProfileType: LearningProfileType;

  @property({
    type: 'string',
    required: true,
  })
  learningNickname: string;

  @property({
    type: 'string',
  })
  learningCountry?: string;

  @property({
    type: 'string',
  })
  learningResidence?: string;

  @property({
    type: 'string',
  })
  learningPossibleResidence?: string;

  @property({
    type: 'string',
  })
  learningBackground?: string;

  @property({
    type: 'string',
  })
  stuPreferSex?: string;

  @property({
    type: 'string',
  })
  stuStatus?: string;

  @property({
    type: 'string',
  })
  stuSubject?: string;

  @property({
    type: 'string',
  })
  stuPreferLesson?: string;

  @property({
    type: 'string',
  })
  stuPossibleDay?: string;

  @property({
    type: 'string',
  })
  stuPossibleTime?: string;

  @property({
    type: 'string',
  })
  stuSpecial?: string;

  @property({
    type: 'string',
  })
  stuToTeacher?: string;

  @property({
    type: 'string',
  })
  stuIdentityPhoto?: string;

  @property({
    type: 'boolean',
  })
  tchPossibleOnlineLesson?: boolean;

  @property({
    type: 'string',
  })
  tchUniversity?: string;

  @property({
    type: 'string',
  })
  tchDepartment?: string;

  @property({
    type: 'number',
  })
  tchGraduateYear?: number;

  @property({
    type: 'string',
  })
  tchAvailableAge?: string;

  @property({
    type: 'string',
  })
  tchSubject?: string;

  @property({
    type: 'string',
  })
  tchPreferLesson?: string;

  @property({
    type: 'string',
  })
  tchPossibleDay?: string;

  @property({
    type: 'string',
  })
  tchPossibleTime?: string;

  @property({
    type: 'string',
  })
  tchPossibleDayTime?: string;

  @property({
    type: 'string',
  })
  tchLessonPrice?: string;

  @property({
    type: 'string',
  })
  tchExperience?: string;

  @property({
    type: 'string',
  })
  tchOneLineNote?: string;

  @property({
    type: 'string',
  })
  tchLessonStyle?: string;

  @property({
    type: 'string',
  })
  tchProfileMainPhoto?: string;

  @property({
    type: 'string',
  })
  tchProfileSecondPhoto?: string;

  @property({
    type: 'string',
  })
  tchIdentityPhoto?: string;

  @property({
    type: 'string',
  })
  tchVerifyPhoto?: string;

  @property({
    type: 'number',
    default: 0
  })
  learningAdminAdd?: number;

  @property({
    type: 'number',
    default: 0
  })
  learningRanking?: number;

  @property({
    type: 'date'
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;



  constructor(data?: Partial<LearningProfile>) {
    super(data);
  }
}

export interface LearningProfileRelations {
  // describe navigational properties here
  user: UserWithRelations;
}

export type LearningProfileWithRelations = LearningProfile & LearningProfileRelations;

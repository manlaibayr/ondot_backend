import {belongsTo, Entity, model, property} from '@loopback/repository';
import {User, UserWithRelations} from './user.model';

@model({settings: {mysql: {table: 'hobby_profile'}}})
export class HobbyProfile extends Entity {
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
  })
  hobbyNickname: string;

  @property({
    type: 'string',
  })
  hobbyResidence?: string;

  @property({
    type: 'string',
    required: true,
  })
  hobbyCategories: string;

  @property({
    type: 'string',
  })
  hobbyPhoto?: string;

  @property({
    type: 'date'
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<HobbyProfile>) {
    super(data);
  }
}

export interface HobbyProfileRelations {
  // describe navigational properties here
  user: UserWithRelations;
}

export type HobbyProfileWithRelations = HobbyProfile & HobbyProfileRelations;

import {belongsTo, Entity, model, property} from '@loopback/repository';
import {User, UserWithRelations} from './user.model';
import {ServiceType} from '../types';

@model()
export class Visit extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => User, {keyTo: 'visitUserId', name: 'visitUser'})
  visitUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  visitOtherUserId: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ServiceType),
    },
  })
  visitServiceType: ServiceType;

  @property({
    type: 'date',
    default: "$now"
  })
  visitLastTime?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<Visit>) {
    super(data);
  }
}

export interface VisitRelations {
  // describe navigational properties here
  visitUser?: UserWithRelations;
}

export type VisitWithRelations = Visit & VisitRelations;

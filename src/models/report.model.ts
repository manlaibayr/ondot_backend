import {belongsTo, Entity, model, property} from '@loopback/repository';
import {ReportType, ServiceType} from '../types';
import {User, UserWithRelations} from './user.model';

@model()
export class Report extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => User, {keyTo: 'reportUserId', name: 'user'})
  reportUserId: string;

  @belongsTo(() => User, {keyTo: 'reportOtherUserId', name: 'otherUser'})
  reportOtherUserId: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ReportType)
    }
  })
  reportType?: ReportType;

  @property({
    type: 'string',
  })
  reportText?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ServiceType),
    },
  })
  reportServiceType: ServiceType;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<Report>) {
    super(data);
  }
}

export interface ReportRelations {
  // describe navigational properties here
  user?: UserWithRelations;
  otherUser?: UserWithRelations;
}

export type ReportWithRelations = Report & ReportRelations;

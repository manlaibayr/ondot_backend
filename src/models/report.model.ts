import {Entity, model, property} from '@loopback/repository';
import {ReportType, ServiceType} from '../types';

@model()
export class Report extends Entity {
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
  reportUserId: string;

  @property({
    type: 'string',
    required: true,
  })
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
}

export type ReportWithRelations = Report & ReportRelations;

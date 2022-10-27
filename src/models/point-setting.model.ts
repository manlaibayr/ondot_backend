import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'point_setting'}}})
export class PointSetting extends Entity {
  @property({
    type: 'string',
    id: true,
  })
  id: string;

  @property({
    type: 'string',
  })
  pointSettingServiceType?: string;

  @property({
    type: 'string',
    required: true,
  })
  pointSettingTitle: string;

  @property({
    type: 'number',
    required: true,
  })
  pointSettingAmount: number;

  @property({
    type: 'date',
  })
  updatedAt?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<PointSetting>) {
    super(data);
  }
}

export interface PointSettingRelations {
  // describe navigational properties here
}

export type PointSettingWithRelations = PointSetting & PointSettingRelations;

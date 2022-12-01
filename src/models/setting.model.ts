import {Entity, model, property} from '@loopback/repository';

@model()
export class Setting extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
  })
  value?: string;

  @property({
    type: 'date',
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;


  constructor(data?: Partial<Setting>) {
    super(data);
  }
}

export interface SettingRelations {
  // describe navigational properties here
}

export type SettingWithRelations = Setting & SettingRelations;

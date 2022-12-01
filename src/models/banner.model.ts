import {Entity, model, property} from '@loopback/repository';
import {BannerType, ServiceType} from '../types';

@model()
export class Banner extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ServiceType),
    },
  })
  bannerServiceType: ServiceType;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(BannerType),
    },
  })
  bannerShowType: BannerType;

  @property({
    type: 'string',
    required: true,
  })
  bannerImgUrl: string;

  @property({
    type: 'string',
  })
  bannerPopupImgUrl?: string;

  @property({
    type: 'string',
  })
  bannerLink?: string;

  @property({
    type: 'boolean',
    required: true,
  })
  bannerStatus: boolean;

  @property({
    type: 'date',
  })
  createdAt?: string;

  @property({
    type: 'date',
  })
  updatedAt?: string;


  constructor(data?: Partial<Banner>) {
    super(data);
  }
}

export interface BannerRelations {
  // describe navigational properties here
}

export type BannerWithRelations = Banner & BannerRelations;

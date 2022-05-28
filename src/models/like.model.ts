import {belongsTo, Entity, model, property} from '@loopback/repository';
import {ServiceType} from '../types';
import {User, UserWithRelations} from './user.model';

@model()
export class Like extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => User, {keyTo: 'likeUserId', name: 'likeUser'})
  likeUserId: string;

  @belongsTo(() => User, {keyTo: 'likeOtherUserId', name: 'likeOtherUser'})
  likeOtherUserId: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ServiceType),
    },
  })
  likeServiceType: ServiceType;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;



  constructor(data?: Partial<Like>) {
    super(data);
  }
}

export interface LikeRelations {
  // describe navigational properties here
  likeUser?: UserWithRelations;
  likeOtherUser?: UserWithRelations;
}

export type LikeWithRelations = Like & LikeRelations;

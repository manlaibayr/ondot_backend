import {belongsTo, Entity, model, property} from '@loopback/repository';
import {ServiceType} from '../types';
import {User, UserWithRelations} from './user.model';

@model({settings: {mysql: {table: 'block_user'}}})
export class BlockUser extends Entity {
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
  blockUserId: string;

  @belongsTo(() => User, {keyTo: 'blockOtherUserId', name: 'blockOtherUser'})
  blockOtherUserId: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ServiceType),
    },
  })
  blockServiceType: ServiceType;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<BlockUser>) {
    super(data);
  }
}

export interface BlockUserRelations {
  // describe navigational properties here
  blockOtherUser?: UserWithRelations;
}

export type BlockUserWithRelations = BlockUser & BlockUserRelations;

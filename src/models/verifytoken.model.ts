import {belongsTo, Entity, model, property} from '@loopback/repository';
import {User} from './user.model';

@model({settings: {mysql: {table: 'verifytoken'}}})
export class Verifytoken extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => User, {keyTo: 'user_id', name: 'user'})
  user_id: string;

  @property({
    type: 'boolean',
    default: true,
  })
  token_valid?: boolean;

  @property({
    type: 'date'
  })
  expire?: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  created_at: Date;


  constructor(data?: Partial<Verifytoken>) {
    super(data);
  }
}

export interface VerifytokenRelations {
  // describe navigational properties here
}

export type VerifytokenWithRelations = Verifytoken & VerifytokenRelations;

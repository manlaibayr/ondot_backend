import {Entity, model, property, belongsTo} from '@loopback/repository';
import {User} from './user.model';
import {Role} from './role.model';

@model()
export class Rolemapping extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @belongsTo(() => User, {keyTo: 'user_id', name: 'user'})
  user_id: string;

  @belongsTo(() => Role, {keyTo: 'role_id', name: 'role'})
  role_id: string;


  constructor(data?: Partial<Rolemapping>) {
    super(data);
  }
}

export interface RolemappingRelations {
  // describe navigational properties here
}

export type RolemappingWithRelations = Rolemapping & RolemappingRelations;

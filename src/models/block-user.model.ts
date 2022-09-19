import {belongsTo, Entity, hasOne, model, property} from '@loopback/repository';
import {ServiceType} from '../types';
import {User, UserWithRelations} from './user.model';
import {MeetingProfile} from './meeting-profile.model';
import {HobbyProfile} from './hobby-profile.model';
import {LearningProfile} from './learning-profile.model';

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

  @property({
    type: 'string',
    required: true,
  })
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

  @hasOne(() => MeetingProfile, {keyTo: 'userId', keyFrom: 'blockOtherUserId'})
  blockMeetingProfile?: MeetingProfile;

  @hasOne(() => HobbyProfile, {keyTo: 'userId', keyFrom: 'blockOtherUserId'})
  blockHobbyProfile?: HobbyProfile;

  @hasOne(() => LearningProfile, {keyTo: 'userId', keyFrom: 'blockOtherUserId'})
  blockLearningProfile?: LearningProfile;

  constructor(data?: Partial<BlockUser>) {
    super(data);
  }
}

export interface BlockUserRelations {
  // describe navigational properties here
  blockMeetingProfile?: MeetingProfile,
  blockHobbyProfile?: HobbyProfile;
  blockLearningProfile?: LearningProfile;
}

export type BlockUserWithRelations = BlockUser & BlockUserRelations;

import {Entity, hasOne, model, property} from '@loopback/repository';
import {HobbyProfile} from './hobby-profile.model';

@model({settings: {mysql: {table: 'chat_group_msg'}}})
export class ChatGroupMsg extends Entity {
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
  groupRoomId: string;

  @property({
    type: 'string',
    required: true,
  })
  groupSenderUserId: string;

  @property({
    type: 'string',
  })
  groupMsgContent?: string;

  @property({
    type: 'string',
    required: true,
  })
  groupMsgType: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;

  @hasOne(() => HobbyProfile, {keyTo: 'userId', keyFrom: 'groupSenderUserId'})
  hobbyProfile?: HobbyProfile;

  constructor(data?: Partial<ChatGroupMsg>) {
    super(data);
  }
}

export interface ChatGroupMsgRelations {
  // describe navigational properties here
  hobbyProfile? : HobbyProfile;
}

export type ChatGroupMsgWithRelations = ChatGroupMsg & ChatGroupMsgRelations;

import {Entity, model, property} from '@loopback/repository';
import {ChatMsgStatus} from '../types';

@model({settings: {mysql: {table: 'chat_msg'}}})
export class ChatMsg extends Entity {
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
  chatContactId: string;

  @property({
    type: 'string',
    required: true,
  })
  senderUserId: string;

  @property({
    type: 'string',
    required: true,
  })
  receiverUserId: string;

  @property({
    type: 'string',
  })
  msgContent?: string;

  @property({
    type: 'string',
    required: true,
  })
  msgType: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ChatMsgStatus),
    },
  })
  msgSenderStatus: ChatMsgStatus;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: Object.values(ChatMsgStatus),
    },
  })
  msgReceiverStatus: ChatMsgStatus;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<ChatMsg>) {
    super(data);
  }
}

export interface ChatMsgRelations {
  // describe navigational properties here
}

export type MeetingChatWithRelations = ChatMsg & ChatMsgRelations;

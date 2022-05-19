import {Entity, model, property} from '@loopback/repository';

@model()
export class Notice extends Entity {
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
  noticeTitle: string;

  @property({
    type: 'string',
  })
  noticeContent?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;


  constructor(data?: Partial<Notice>) {
    super(data);
  }
}

export interface NoticeRelations {
  // describe navigational properties here
}

export type NoticeWithRelations = Notice & NoticeRelations;

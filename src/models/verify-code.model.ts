import {Entity, model, property} from '@loopback/repository';

@model()
export class VerifyCode extends Entity {
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
  verifyPhoneNumber: string;

  @property({
    type: 'string',
    required: true,
  })
  verifyCodeString: string;

  @property({
    type: 'date',
    required: true,
  })
  expiredDate: Date;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;


  constructor(data?: Partial<VerifyCode>) {
    super(data);
  }
}

export interface VerifyCodeRelations {
  // describe navigational properties here
}

export type VerifyCodeWithRelations = VerifyCode & VerifyCodeRelations;

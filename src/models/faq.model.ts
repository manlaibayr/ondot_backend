import {Entity, model, property} from '@loopback/repository';

@model()
export class Faq extends Entity {
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
  faqTitle: string;

  @property({
    type: 'string',
  })
  faqContent?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;


  constructor(data?: Partial<Faq>) {
    super(data);
  }
}

export interface FaqRelations {
  // describe navigational properties here
}

export type FaqWithRelations = Faq & FaqRelations;

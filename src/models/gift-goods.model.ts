import {Entity, model, property} from '@loopback/repository';

@model({settings: {mysql: {table: 'gift_goods'}}})
export class GiftGoods extends Entity {
  @property({
    type: 'string',
    id: true
  })
  goods_id: string;

  @property({
    type: 'string',
  })
  category1?: string;

  @property({
    type: 'string',
  })
  category2?: string;

  @property({
    type: 'string',
  })
  affiliate?: string;

  @property({
    type: 'string',
  })
  affiliate_category?: string;

  @property({
    type: 'string',
  })
  head_swap_cd?: string;

  @property({
    type: 'string',
  })
  swap_cd?: string;

  @property({
    type: 'string',
  })
  desc?: string;

  @property({
    type: 'string',
  })
  goods_nm?: string;

  @property({
    type: 'string',
  })
  goods_img?: string;

  @property({
    type: 'number',
  })
  normal_sale_price?: number;

  @property({
    type: 'number',
  })
  normal_sale_vat?: number;

  @property({
    type: 'number',
  })
  sale_price?: number;

  @property({
    type: 'number',
  })
  sale_vat?: number;

  @property({
    type: 'number',
  })
  total_price?: number;

  @property({
    type: 'string',
  })
  period_end?: string;

  @property({
    type: 'string',
  })
  limit_date?: string;

  @property({
    type: 'string',
  })
  end_date?: string;

  @property({
    type: 'string',
  })
  delivery_url?: string;

  @property({
    type: 'string',
  })
  opt_val_list?: string;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt?: Date;


  constructor(data?: Partial<GiftGoods>) {
    super(data);
  }
}

export interface GiftGoodsRelations {
  // describe navigational properties here
}

export type GiftGoodsWithRelations = GiftGoods & GiftGoodsRelations;

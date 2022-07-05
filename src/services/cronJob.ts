import {createBindingFromClass, inject} from '@loopback/core';
import { RestApplication } from '@loopback/rest';
import {CronComponent, CronJob, cronJob} from '@loopback/cron';
import {ChargeHistoryController, GiftGoodsController} from '../controllers';
import {GiftGoodsRepository} from '../repositories';

@cronJob()
class GiftingGoodsCronJob extends CronJob {
  constructor(
    @inject(`controllers.GiftGoodsController`) giftGoodsController: GiftGoodsController
  ) {
    super({
      name: 'statistic-job',
      onTick: async () => {
        await giftGoodsController.getListFromGifting()
      },
      cronTime: '0 0 0 * * *',
      start: true,
    });
  }
}

@cronJob()
class MyCronJob1 extends CronJob {
  constructor(
  ) {
    super({
      name: 'statistic-job1',
      onTick: () => {
        console.log('two second')
      },
      cronTime: '*/2 * * * * *',
      start: true,
    });
  }
}

export function initCronJob(app: RestApplication) {
  // app.component(CronComponent);
  // app.add(createBindingFromClass(GiftingGoodsCronJob));
  // app.add(createBindingFromClass(MyCronJob1));
}
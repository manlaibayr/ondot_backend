import {createBindingFromClass, inject} from '@loopback/core';
import { RestApplication } from '@loopback/rest';
import {CronComponent, CronJob, cronJob} from '@loopback/cron';
import {GiftGoodsController} from '../controllers';
import {HobbyRoomRepository} from '../repositories';
import {repository} from '@loopback/repository';

@cronJob()
class EveryDayCronJob extends CronJob {
  constructor(
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @inject(`controllers.GiftGoodsController`) giftGoodsController: GiftGoodsController
  ) {
    super({
      name: 'statistic-job',
      onTick: async () => {
        await giftGoodsController.getListFromGifting();
        // 취미방 완료날짜 처리
        await this.hobbyRoomRepository.updateAll({isRoomDelete: true}, {isRoomDelete: false, roomExpiredDate : {lt: new Date()}});
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
  app.component(CronComponent);
  app.add(createBindingFromClass(EveryDayCronJob));
  // app.add(createBindingFromClass(MyCronJob1));
}
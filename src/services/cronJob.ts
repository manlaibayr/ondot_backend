import {createBindingFromClass, inject} from '@loopback/core';
import {RestApplication} from '@loopback/rest';
import {CronComponent, CronJob, cronJob} from '@loopback/cron';
import {repository} from '@loopback/repository';
import moment from 'moment';
import {GiftGoodsController, HobbyRoomController, RankingUserController, UserController} from '../controllers';
import {HobbyProfileRepository, HobbyRoomRepository, LearningProfileRepository, MeetingProfileRepository, UserRepository} from '../repositories';
import {RankingType} from '../types';

@cronJob()
class EveryDayCronJob extends CronJob {
  constructor(
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @repository(MeetingProfileRepository) private meetingProfileRepository: MeetingProfileRepository,
    @repository(HobbyProfileRepository) private hobbyProfileRepository: HobbyProfileRepository,
    @repository(LearningProfileRepository) private learningProfileRepository: LearningProfileRepository,
    @inject(`controllers.GiftGoodsController`) giftGoodsController: GiftGoodsController,
    @inject(`controllers.RankingUserController`) rankingUserController: RankingUserController,
    @inject(`controllers.HobbyRoomController`) hobbyRoomController: HobbyRoomController,
  ) {
    super({
      name: 'statistic-job',
      onTick: async () => {
        // 매일 기프티콘 얻어오기
        await giftGoodsController.getListFromGifting();
        // 매일 취미방 완료날짜 처리
        await hobbyRoomController.procExpiredRooms();
        // 매일 3달동안 이용안한 플라워제거

        // 매일 회원들의 미팅호감지수, 러닝 좋아요지수 계산
        await rankingUserController.cronUserTotalLike();

        // 매일 회원들 나이 다시 반영
        const birthdayUserList = await this.userRepository.find({where: {birthday: {like: '%' + moment().format('MMDD')}}, fields: ['id', 'birthday']});
        for (const userInfo of birthdayUserList) {
          const age = moment().diff(moment(userInfo.birthday), 'years');
          await Promise.all([
            this.userRepository.updateById(userInfo.id, {age: age}),
            this.meetingProfileRepository.updateAll({age}, {userId: userInfo.id}),
            this.hobbyProfileRepository.updateAll({age}, {userId: userInfo.id}),
            this.learningProfileRepository.updateAll({age}, {userId: userInfo.id}),
          ]);
        }

        //일요일이면 주간 랭킹 처리
        if (moment().day() === 0) {
          await rankingUserController.cronRanking(RankingType.WEEK);
        }
        //새달이 시작되면 월간 랭킹 처리
        if (moment().date() === 1) {
          await rankingUserController.cronRanking(RankingType.MONTH);
        }
        //새년이 시작되면 회원들 나이 다시 반영
        if (moment().isSame(moment().startOf('year'), 'day')) {

        }

      },
      cronTime: '1 0 0 * * *', // 매일 0시 0분 1초에 실행
      start: true,
    });
  }
}

@cronJob()
class MyCronJob1 extends CronJob {
  constructor() {
    super({
      name: 'statistic-job1',
      onTick: () => {
        console.log('two second');
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
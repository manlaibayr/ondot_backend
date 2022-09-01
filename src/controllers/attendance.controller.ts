import {repository} from '@loopback/repository';
import {get, getModelSchemaRef, response} from '@loopback/rest';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import moment from 'moment';
import {Attendance} from '../models';
import {AttendanceRepository, FlowerHistoryRepository, UserRepository} from '../repositories';
import {FlowerHistoryType, UserCredentials} from '../types';
import {secured, SecuredType} from '../role-authentication';

export class AttendanceController {
  constructor(
    @repository(AttendanceRepository) public attendanceRepository: AttendanceRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(FlowerHistoryRepository) public flowerHistoryRepository: FlowerHistoryRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  @get('/attendances')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(200, {
    description: 'Attendance model instance',
    content: {'application/json': {schema: getModelSchemaRef(Attendance)}},
  })
  async create() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const month = Number(moment().format('M'));
    const day = Number(moment().format('D'));
    const newAttendance = {attendanceUserId: currentUser.userId, attendanceMonth: month, attendanceDay: day};
    const info = await this.attendanceRepository.findOne({where: newAttendance});
    let addFlower = 0;
    if(!info) {
      const attendanceInfo = await this.attendanceRepository.create(newAttendance);
      const attendanceCount = await this.attendanceRepository.count({attendanceUserId: currentUser.userId, attendanceMonth: month});
      if([7, 14, 21].indexOf(attendanceCount.count) !== -1) {
        // 플라워 50송이추가
        addFlower = 50;
      } else if (attendanceCount.count === 28) {
        // 플라워 100송이추가
        addFlower = 100;
      } else {
        // 플라워 15송이추가
        addFlower = 15;
      }
      if(addFlower !== 0) {
        const userInfo = await this.userRepository.findById(currentUser.userId);
        userInfo.freeFlower = !userInfo.freeFlower ? addFlower : userInfo.freeFlower + addFlower;
        await this.userRepository.save(userInfo);
        await this.flowerHistoryRepository.create({
          flowerUserId: currentUser.userId,
          flowerContent: attendanceCount.count + '일 출석체크 보상',
          flowerValue: addFlower,
          isFreeFlower: true,
          flowerHistoryType: FlowerHistoryType.ATTENDANCE,
          flowerHistoryRefer: attendanceInfo.id,
        })
      }
    }
    const count = await this.attendanceRepository.count({attendanceUserId: currentUser.userId, attendanceMonth: month});
    return {count: count.count, addFlower};
  }
}

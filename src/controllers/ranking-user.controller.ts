import {get, HttpErrors, param, post, requestBody, response} from '@loopback/rest';
import {Getter, inject} from '@loopback/core';
import {AuthenticationBindings} from '@loopback/authentication';
import {UserProfile} from '@loopback/security';
import {Filter, repository} from '@loopback/repository';
import moment from 'moment';
import {secured, SecuredType} from '../role-authentication';
import {LearningProfileType, RankingType, ServiceType, UserCredentials} from '../types';
import {LearningQuestionComment, LearningReview, RankingUser} from '../models';
import {
  AttendanceRepository,
  ChatContactRepository,
  HobbyRoomRepository,
  LearningProfileRepository,
  LearningQuestionCommentRepository,
  LearningQuestionRepository,
  LearningReviewRepository,
  LikeRepository,
  RankingUserRepository,
  RatingRepository,
  UserRepository,
  VisitRepository,
} from '../repositories';

export class RankingUserController {
  constructor(
    @repository(RankingUserRepository) private rankingUserRepository: RankingUserRepository,
    @repository(UserRepository) public userRepository: UserRepository,
    @repository(LikeRepository) public likeRepository: LikeRepository,
    @repository(ChatContactRepository) public chatContactRepository: ChatContactRepository,
    @repository(RatingRepository) public ratingRepository: RatingRepository,
    @repository(VisitRepository) public visitRepository: VisitRepository,
    @repository(HobbyRoomRepository) public hobbyRoomRepository: HobbyRoomRepository,
    @repository(LearningProfileRepository) public learningProfileRepository: LearningProfileRepository,
    @repository(AttendanceRepository) public attendanceRepository: AttendanceRepository,
    @repository(LearningQuestionRepository) public learningQuestionRepository: LearningQuestionRepository,
    @repository(LearningQuestionCommentRepository) public learningQuestionCommentRepository: LearningQuestionCommentRepository,
    @repository(LearningReviewRepository) public learningReviewRepository: LearningReviewRepository,
    @inject.getter(AuthenticationBindings.CURRENT_USER) readonly getCurrentUser: Getter<UserProfile>,
  ) {
  }

  private getRankingDate(rankingType: RankingType) {
    let startDate: Date, endDate: Date, rankingDate: string;
    if (rankingType === RankingType.WEEK) {
      startDate = moment().subtract(1, 'weeks').startOf('week').toDate();
      endDate = moment().subtract(1, 'weeks').endOf('week').toDate();
      rankingDate = moment(startDate).format('gggg wo');
    } else if (rankingType === RankingType.MONTH) {
      startDate = moment().subtract(1, 'months').startOf('month').toDate();
      endDate = moment().subtract(1, 'months').endOf('month').toDate();
      rankingDate = moment(startDate).format('YYYY.MM');
    } else {
      throw new Error('Incorrect ranking type');
    }
    return {startDate, endDate, rankingDate};
  }

  public async calcUserAvgRating(userId: string, startDate: Date, endDate: Date) {
    const rankingList = await this.ratingRepository.find({where: {ratingOtherUserId: userId, createdAt: {between: [startDate, endDate]}}, fields: ['ratingValue']});
    const sumRanking = rankingList.reduce((acc, cur) => acc + cur.ratingValue, 0);
    return sumRanking === rankingList.length ? 0 : Number((sumRanking / rankingList.length).toFixed(2));
  }

  private async calcUserMeetingMonthFavor(userId: string, startDate: Date, endDate: Date) {
    const userInfo = await this.userRepository.findById(userId);
    if (!userInfo.meetingProfileId) return null;
    const visitCount = await this.visitRepository.count({visitOtherUserId: userId, createdAt: {between: [startDate, endDate]}});
    const likeCount = await this.likeRepository.count({likeOtherUserId: userId, createdAt: {between: [startDate, endDate]}});
    const contactCount = await this.chatContactRepository.count({contactOtherUserId: userId, contactServiceType: ServiceType.MEETING, createdAt: {between: [startDate, endDate]}});
    const averageRating = await this.calcUserAvgRating(userId, startDate, endDate);
    const data = {
      visit: Math.min(100, visitCount.count),
      like: Math.min(100, likeCount.count),
      contact: Math.min(100, contactCount.count),
      averageRating: Math.min(100, averageRating * 20),
    };
    return {
      ...data,
      sumFavor: data.visit + data.like + data.contact + data.averageRating,
    };
  }

  public async calcUserMeetingTotalFavor(userId: string) {
    const favorList = await this.rankingUserRepository.find({where: {rankingUserId: userId, rankingServiceType: ServiceType.MEETING, rankingType: RankingType.MONTH}, fields: ['rankingValue']});
    const sum = favorList.reduce((acc, cur) => acc + cur.rankingValue, 0);
    return favorList.length === 0 ? 0 : Number((sum / favorList.length).toFixed(2));
  }

  private async calcHobbyRoomRanking() {
    const hobbyRoomList = await this.hobbyRoomRepository.find({where: {isRoomDelete: false}, order: ['roomMemberNumber desc'], limit: 10});
    return hobbyRoomList.map((v) => ({roomId: v.id, ranking: v.roomMemberNumber}));
  }

  private async calcUserLearningMonthFavor(userId: string, startDate: Date, endDate: Date) {
    const userInfo = await this.userRepository.findById(userId);
    if (!userInfo.learningProfileId) return null;
    const data = {
      attendance: 0,
      question: 0,
      questionComment: 0,
      thumb: 0,
      review: 0,
      sum: 0,
    };
    const learningProfile = await this.learningProfileRepository.findById(userInfo.learningProfileId);
    const attendanceCount = await this.attendanceRepository.count({attendanceUserId: userId, createdAt: {between: [startDate, endDate]}});
    data.attendance = Math.min(attendanceCount.count * 5, 100);
    const questionCount = await this.learningQuestionRepository.count({questionUserId: userId, createdAt: {between: [startDate, endDate]}});
    data.question = Math.min(questionCount.count * 5, 100);
    const questionCommentList = await this.learningQuestionCommentRepository.find({where: {commentUserId: userId, createdAt: {between: [startDate, endDate]}}});
    data.questionComment = Math.min(questionCommentList.length * 10, 100);
    const commentThumbCount = questionCommentList.reduce((acc: number, v: LearningQuestionComment) => (acc + (v.commentThumbCount || 0)) , 0);
    data.thumb = Math.min(commentThumbCount * 10, 100);
    const reviewList = await this.learningReviewRepository.find({where: {reviewTeacherUserId: userId, createdAt: {between: [startDate, endDate]}}});
    data.review = reviewList.length === 0 ? 0 : Math.floor((reviewList.reduce((acc: number, v: LearningReview) => (v.reviewValue || 0) * 20, 0)) / reviewList.length);
    if(learningProfile.learningProfileType === LearningProfileType.STUDENT) {
      data.sum = data.attendance + data.question + data.thumb;
    } else {
      data.sum = data.attendance + data.questionComment + data.thumb + data.review;
    }
    return data;
  }

  @get('/ranking-users/calc')
  public async runCalcFromApi() {
    await this.cronRanking(RankingType.MONTH);
  }

  public async cronRanking(rankingType: RankingType) {
    const {startDate, endDate, rankingDate} = this.getRankingDate(rankingType);
    const userList = await this.userRepository.find({});
    //미팅 호감도
    const meetingFavorList = [];
    const meetingRatingList = [];
    for (const u of userList) {
      const favor = await this.calcUserMeetingMonthFavor(u.id, startDate, endDate);
      if (favor !== null) {
        // 미팅 프로필 존재
        meetingFavorList.push({userId: u.id, ranking: favor.sumFavor, rankingSex: u.sex});
        // 미팅 월 평균 별점 추가
        if (rankingType === RankingType.MONTH) {
          const avgRating = await this.calcUserAvgRating(u.id, startDate, endDate);
          meetingRatingList.push({userId: u.id, avgRating, rankingSex: u.sex});
        }
      }
    }
    meetingFavorList.sort((a: any, b: any) => a.ranking - b.ranking);

    //러닝
    //취미
    const hobbyRankingList = await this.calcHobbyRoomRanking();

    // 디비에 추가
    const rankingList: RankingUser[] = [];
    meetingFavorList.forEach((v) => {
      rankingList.push(new RankingUser({
        rankingUserId: v.userId,
        rankingValue: v.ranking,
        rankingServiceType: ServiceType.MEETING,
        rankingType: rankingType,
        rankingDate: rankingDate,
        rankingSex: v.rankingSex,
        rankingShow: true,
      }));
    });
    meetingRatingList.forEach((v) => {
      rankingList.push(new RankingUser({
        rankingUserId: v.userId,
        rankingValue: v.avgRating,
        rankingServiceType: ServiceType.MEETING,
        rankingType: RankingType.MONTH_RATING,
        rankingDate: rankingDate,
        rankingSex: v.rankingSex,
        rankingShow: true,
      }));
    });
    hobbyRankingList.forEach((v) => {
      rankingList.push(new RankingUser({
        rankingHobbyRoomId: v.roomId,
        rankingValue: v.ranking,
        rankingServiceType: ServiceType.HOBBY,
        rankingType: rankingType,
        rankingDate: rankingDate,
        rankingShow: true,
      }));
    });
    await this.rankingUserRepository.deleteAll({rankingDate: rankingDate});
    await this.rankingUserRepository.createAll(rankingList);
  }

  public async cronUserTotalLike() {
    const userList = await this.userRepository.find({});
    //미팅 호감도
    for (const u of userList) {
      // 누적지수 계산
      try {
        const meetingFavor = await this.calcUserMeetingMonthFavor(u.id, moment('2022-01-01').toDate(), moment().toDate());
        const learningFavor = await this.calcUserLearningMonthFavor(u.id, moment('2022-01-01').toDate(), moment().toDate());
        await this.userRepository.updateById(u.id, {meetingRanking: meetingFavor?.sumFavor || 0, learningRanking: learningFavor?.sum || 0});
      } catch (e) {}
    }
  }

  @get('/ranking-users/meeting-favor')
  @secured(SecuredType.IS_AUTHENTICATED)
  async meetingFavorInfo() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const userInfo = await this.userRepository.findById(currentUser.userId);
    if(userInfo.createdAt > moment().subtract(2, 'weeks').toDate()) {
      return { needWait: true}
    }
    const {rankingDate} = this.getRankingDate(RankingType.MONTH);
    const favorInfo = await this.calcUserMeetingMonthFavor(currentUser.userId, moment().startOf('week').toDate(), moment().toDate());
    if (!favorInfo) throw new HttpErrors.BadRequest('미팅 프로필이 존재하지 않습니다.');
    const sexRatingList = await this.rankingUserRepository.find({
      where: {rankingServiceType: ServiceType.MEETING, rankingType: RankingType.MONTH_RATING, rankingDate, rankingSex: userInfo.sex},
      fields: ['rankingValue'],
    });
    const sexSumRating = sexRatingList.reduce((acc, cur) => acc + cur.rankingValue, 0);
    const lastMonthRating = await this.rankingUserRepository.findOne({
      where: {
        rankingUserId: currentUser.userId,
        rankingServiceType: ServiceType.MEETING,
        rankingType: RankingType.MONTH_RATING,
        rankingDate,
      },
    });
    const allFavorList = await this.rankingUserRepository.find({where: {rankingType: RankingType.MONTH, rankingServiceType: ServiceType.MEETING, rankingDate}, order: ['rankingValue desc']});
    const myFavorInfoIndex = allFavorList.findIndex((v) => v.rankingUserId === currentUser.userId);
    const favorPercentage = (allFavorList.length === 0 || myFavorInfoIndex === -1) ? 100 : Number((myFavorInfoIndex / allFavorList.length).toFixed(2)) * 100;
    return {
      currentAvgRating: favorInfo.averageRating / 20,
      sex: userInfo.sex ? '남성' : '여성',
      sexAvgRating: sexRatingList.length === 0 ? 0 : Number((sexSumRating / sexRatingList.length).toFixed(2)),
      lastMonthRating: lastMonthRating ? lastMonthRating.rankingValue : 0,
      favorPercentage,
      currentMonth: {
        visit: favorInfo.visit,
        like: favorInfo.like,
        contact: favorInfo.contact,
        rating: favorInfo.averageRating,
      },
    };
  }

  @get('/ranking-users/learning-favor')
  @secured(SecuredType.IS_AUTHENTICATED)
  async learningFavorInfo() {
    const currentUser: UserCredentials = await this.getCurrentUser() as UserCredentials;
    const userInfo = await this.userRepository.findById(currentUser.userId);
    if(userInfo.createdAt > moment().subtract(2, 'weeks').toDate()) {
      return { needWait: true}
    }
    const {rankingDate} = this.getRankingDate(RankingType.MONTH);
    const favorInfo = await this.calcUserLearningMonthFavor(currentUser.userId, moment().startOf('week').toDate(), moment().toDate());
    if (!favorInfo) throw new HttpErrors.BadRequest('러닝 프로필이 존재하지 않습니다.');
    const sexRatingList = await this.rankingUserRepository.find({
      where: {rankingServiceType: ServiceType.LEARNING, rankingType: RankingType.MONTH_RATING, rankingDate},
      fields: ['rankingValue'],
    });
    const sexSumRating = sexRatingList.reduce((acc, cur) => acc + cur.rankingValue, 0);
    const lastMonthRating = await this.rankingUserRepository.findOne({
      where: {
        rankingUserId: currentUser.userId,
        rankingServiceType: ServiceType.LEARNING,
        rankingType: RankingType.MONTH_RATING,
        rankingDate,
      },
    });
    const allFavorList = await this.rankingUserRepository.find({where: {rankingType: RankingType.MONTH, rankingServiceType: ServiceType.LEARNING, rankingDate}, order: ['rankingValue desc']});
    const myFavorInfoIndex = allFavorList.findIndex((v) => v.rankingUserId === currentUser.userId);
    const favorPercentage = (allFavorList.length === 0 || myFavorInfoIndex === -1) ? 100 : Number((myFavorInfoIndex / allFavorList.length).toFixed(2)) * 100;
    return {
      currentAvgRating: favorInfo.review / 20,
      sexAvgRating: sexRatingList.length === 0 ? 0 : Number((sexSumRating / sexRatingList.length).toFixed(2)),
      lastMonthRating: lastMonthRating ? lastMonthRating.rankingValue : 0,
      favorPercentage,
      currentMonth: {
        attendance: favorInfo.attendance,
        question: favorInfo.question,
        questionComment: favorInfo.questionComment,
        questionCommentThumb: favorInfo.thumb,
        review: favorInfo.review,
        total: userInfo.learningRanking,
      },
    };
  }

  @post('/ranking-users/list')
  @secured(SecuredType.IS_AUTHENTICATED)
  async userRankingList(
    @requestBody() data: {serviceType: ServiceType, rankingType: RankingType, filterType?: string},
  ) {
    const {rankingDate} = this.getRankingDate(data.rankingType);
    const filter: Filter<RankingUser> = {};
    filter.where = {
      rankingServiceType: data.serviceType,
      rankingType: data.rankingType,
      rankingDate,
    };
    filter.order = ['rankingValue desc'];
    filter.include = [];

    if (data.serviceType === ServiceType.MEETING) {
      filter.include.push({relation: 'meetingProfile'});
      if(data.filterType) {
        filter.where.rankingSex = data.filterType === 'man';
      }
    } else if (data.serviceType === ServiceType.HOBBY) {
      filter.include.push({relation: 'hobbyRoom'});
    }
    const rankingList = await this.rankingUserRepository.find(filter);
    if (data.serviceType === ServiceType.MEETING) {
      return rankingList.map((v) => ({
        id: v.meetingProfile?.id,
        profile: v.meetingProfile?.meetingPhotoMain,
        nickname: v.meetingProfile?.meetingNickname,
        oneLineIntro: v.meetingProfile?.meetingOneLineIntro,
      }));
    } else if (data.serviceType === ServiceType.HOBBY) {
      return rankingList.map((v) => ({
        id: v.rankingHobbyRoomId,
        roomTitle: v.hobbyRoom?.roomTitle,
        roomPhotoMain: v.hobbyRoom?.roomPhotoMain,
        roomRegion: v.hobbyRoom?.roomRegion,
        roomMemberNumber: v.hobbyRoom?.roomMemberNumber,
      }));
    } else {
      return [];
    }
  }


  //*========== admin functions ==========*//
  @get('/ranking-users')
  @secured(SecuredType.HAS_ROLES, ['ADMIN'])
  @response(200, {
    description: 'Array of User model instances',
  })
  async rankingList(
    @param.query.object('search') searchParam: {userSex?: boolean, show?: boolean, serviceType: ServiceType, rankingType: RankingType},
  ) {
    const filter: Filter<RankingUser> = {order: ['rankingValue desc']};
    filter.where = {rankingType: searchParam.rankingType, rankingServiceType: searchParam.serviceType};
    if (searchParam.show !== undefined) filter.where.rankingShow = searchParam.show;
    filter.include = [{relation: 'user'}];
    if (searchParam.serviceType === ServiceType.MEETING) {
      filter.include.push({relation: 'meetingProfile'});
    } else if (searchParam.serviceType === ServiceType.HOBBY) {
      filter.include.push({relation: 'hobbyProfile'});
    }
    filter.limit = 100;
    const data = await this.rankingUserRepository.find(filter);
    return data.map((r) => ({
      userId: r.rankingUserId,
      username: r.user?.username,
      nickname: r.meetingProfile?.meetingNickname ?? r.hobbyRoom?.roomTitle,
      birthday: r.user?.birthday,
      sex: r.user?.sex,
      rankingValue: r.rankingValue,
      show: r.rankingShow,
    }));
  }
}

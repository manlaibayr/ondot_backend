// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-file-transfer
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {RequestHandler} from 'express-serve-static-core';
import {UserProfile} from '@loopback/security';

export type FileUploadHandler = RequestHandler;

export interface UserCredentials extends UserProfile {
  userId: string;
  username: string;
  userType: UserType;
  freeFlower: number;
  payFlower: number;
  verifyToken: string;
}

export enum UserType {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatusType {
  'NORMAL' = 'NORMAL',  // 정상
  'PAUSE' = 'PAUSE',    // 일시정지
  'LEAVE' = 'LEAVE',    // 탈퇴
}

export enum SignupType {
  EMAIL = 'email',
  NAVER = 'naver',
  KAKAO = 'kakao',
  GOOGLE = 'google',
  APPLE = 'apple',
}

export enum FlowerHistoryType {
  ATTENDANCE = 'ATTENDANCE',    // 출석체크
  VIEW_AD = 'VIEW_AD',    // 광고열람보상
  FLOWER_CHARGE = 'FLOWER_CHARGE',      // 유료플라워 충전
  FLOWER_REFUND = 'FLOWER_REFUND',      // 유료플라워 환전
  GIVE_FLOWER = 'GIVE_FLOWER',   // 플라워선물보내기
  RECEIVE_FLOWER = 'RECEIVE_FLOWER', // 플라워선물받기
  SEND_GIFT = 'SEND_GIFT',    // 기프트보내기
  CREATE_ROOM = 'CREATE_ROOM',  // 취미 방창조
  RECREATE_ROOM = 'RECREATE_ROOM', // 취미 방 재개설
  EXTEND_ROOM = 'EXTEND_ROOM', // 취미 방 기간 연장
  LIKE_USER = 'LIKE_USER', // 좋아요,
  REQUEST_CHAT = 'REQUEST_CHAT', // 대화신청
  SEND_NOTE = 'SEND_NOTE', // 쪽지보냄
  REMOVE_FREE = 'REMOVE_FREE',  // 3개월동안 이용안된 무료 포인트 삭제
  TEACHER_REVIEW = 'TEACHER_REVIEW', // 선생의 후기작성 보상
  QUESTION_COMMENT = 'QUESTION_COMMENT', // 질문에 답글달기
  PASS_PURCHASE = 'PASS_PURCHASE', // 이용권구매
  NORMAL = 'NORMAL'
}

export enum ServiceType {
  COMMON = 'COMMON',
  MEETING = 'MEETING',
  LEARNING = 'LEARNING',
  HOBBY = 'HOBBY'
}

export enum ContactStatus {
  REQUEST = '신청중',        // 대화신청함
  REQUESTED = '승인대기중',  // 대화신청받음
  ALLOW = '승인됨',          // 승인됨
  REJECT = '거부함',         // 대화거부함
  REJECTED = '거부됨',       // 대화거부됨
  DELETE = '삭제',          // 방삭제
}

export enum ChatMsgStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  DELETE = 'DELETE'
}

export enum ChatMsgType {
  TEXT = 'text',
  IMAGE = 'image',
  VOICE = 'voice',
  SYSTEM = 'system',
}

export enum AdType {
  GOOGLE_AD = 'GOOGLE_AD',
  LINK = 'LINK',
}

export enum ReportType {
  TYPE1 = 'TYPE1',  // 광고 등 부적절한 목적의 이용
  TYPE2 = 'TYPE2',  // 개인정보 기재
  TYPE3 = 'TYPE3',  // 욕설이나 비방
  TYPE4 = 'TYPE4',  // 부정적인 음성메세지
  OTHER = 'OTHER'   // 기타
}

export enum MainSocketMsgType {
  SRV_REQUEST_CHAT = 'SRV_REQUEST_CHAT',
  SRV_RECEIVE_NOTE = 'SRV_RECEIVE_NOTE',
  SRV_OTHER_USER_CHAT = 'SRV_OTHER_USER_CHAT',
  SRV_CHANGE_CONTACT_LIST = 'SRV_CHANGE_CONTACT_LIST',
  SRV_NOTIFICATION = 'SRV_NOTIFICATION',
  SRV_OTHER_VOICE_REQ = 'SRV_OTHER_VOICE_REQ',
}

export enum ChatSocketMsgType {
  SRV_PREVIOUS_CHAT_LIST = 'SRV_PREVIOUS_CHAT_LIST',
  SRV_CONTACT_INFO = 'SRV_CONTACT_INFO',
  SRV_CONTACT_CHANGE = 'SRV_CONTACT_CHANGE',
  SRV_RECEIVE_MSG = 'SRV_RECEIVE_MSG',
  SRV_VOICE_CALL_START = 'SRV_VOICE_CALL_START',
  SRV_JOIN_VOICE_CALL = 'SRV_JOIN_VOICE_CALL',
  SRV_WEBRTC_OTHER_JOIN = 'SRV_WEBRTC_OTHER_JOIN',  // 상대가 음성채팅화면에 진입
  SRV_WEBRTC_CALLEE_JOINED = 'SRV_WEBRTC_CALLEE_JOINED',
  SRV_WEBRTC_OFFER = 'SRV_WEBRTC_OFFER',
  SRV_WEBRTC_ANSWER = 'SRV_WEBRTC_ANSWER',
  SRV_WEBRTC_CANDIDATE = 'SRV_WEBRTC_CANDIDATE',
  SRV_WEBRTC_REJECTED = 'SRV_WEBRTC_REJECTED',
  SRV_WEBRTC_FINISH = 'SRV_WEBRTC_FINISH',
  SRV_WEBRTC_OTHER_BUSY = 'SRV_WEBRTC_OTHER_BUSY',  // 상대가 통화중
}

export enum NotificationType {
  NOTE = 'NOTE',
  NOTE_ANSWER = 'NOTE_ANSWER',
  CHAT_REQUEST = 'CHAT_REQUEST',
  ROOM_QUESTION = 'ROOM_QUESTION',
  ROOM_ANSWER = 'ROOM_ANSWER',
  ROOM_REQUEST_RECV = 'ROOM_REQUEST_RECV',
  ROOM_REQUEST_ALLOW = 'ROOM_REQUEST_ALLOW',
  ROOM_REQUEST_REJECT = 'ROOM_REQUEST_REJECT',
  ROOM_INVITE_RECV = 'ROOM_INVITE_RECV',
  ROOM_INVITE_ALLOW = 'ROOM_INVITE_ALLOW',
  ROOM_INVITE_REJECT = 'ROOM_INVITE_REJECT',
  ROOM_KICK = 'ROOM_KICK',
  SENT_GIFTING = 'SENT_GIFTING',
  NORMAL = 'NORMAL',
}

export enum RoomRoleType {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export enum RoomMemberJoinType {
  CREATOR = 'CREATOR',
  INVITE_SEND = 'INVITE_SEND',
  INVITE_REJECT = 'INVITE_REJECT',
  INVITE_ALLOW = 'INVITE_ALLOW',
  REQUEST_RECV = 'REQUEST_RECV',
  REQUEST_REJECT = 'REQUEST_REJECT',
  REQUEST_ALLOW = 'REQUEST_ALLOW',
  KICK = 'KICK',
  LEAVE = 'LEAVE',
}

export enum ChatType {
  MEETING_CHAT = 'MEETING_CHAT',
  LEARNING_CHAT = 'LEARNING_CHAT',
  HOBBY_CHAT = 'HOBBY_CHAT',
  HOBBY_ROOM_CHAT = 'HOBBY_ROOM_CHAT'
}

export enum RankingType {
  WEEK = 'WEEK',  // 주 호감도 통계
  MONTH = 'MONTH',  // 월 호감도 통계
  MONTH_RATING = 'MONTH_RATING', // 월 별점 통계
}

export enum ChargeStatus {
  SUCCESS = 'SUCCESS',
  REFUND_REQUEST = 'REFUND_REQUEST',
  REFUNDED = 'REFUNDED'
}

export enum LearningProfileType {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
}

export enum StoreProductType {
  FLOWER_POINT = 'FLOWER_POINT',  //플라워포인트
  PASS_USABLE = 'PASS_USABLE'     // 이용권
}

export enum PointSettingType {
  POINT_LEARNING_COMMENT = 'POINT_LEARNING_COMMENT',
  POINT_LEARNING_REVIEW = 'POINT_LEARNING_REVIEW',
  POINT_MEETING_CHAT = 'POINT_MEETING_CHAT',
  POINT_MEETING_LIKE = 'POINT_MEETING_LIKE',
  POINT_MEETING_NOTE = 'POINT_MEETING_NOTE',
  POINT_MEETING_PROFILE = 'POINT_MEETING_PROFILE',
  POINT_PUT_IDEA = 'POINT_PUT_IDEA',
  POINT_SIGNUP = 'POINT_SIGNUP',
}

export enum BannerType {
  MENU = 'MENU', // 메뉴연결
  LINK = 'LINK', // 외부링크
  POPUP = 'POPUP', // 팝업
}
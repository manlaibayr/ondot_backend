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

export enum ServiceType {
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
  SRV_REQUEST_CHAT  = 'SRV_REQUEST_CHAT',
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
  SRV_JOIN_VOICE_CALL = 'SRV_JOIN_VOICE_CALL',
  SRV_WEBRTC_OTHER_JOIN = 'SRV_WEBRTC_OTHER_JOIN',  // 상대가 음성채팅화면에 진입
  SRV_WEBRTC_CALLEE_JOINED = 'SRV_WEBRTC_CALLEE_JOINED',
  SRV_WEBRTC_OFFER = 'SRV_WEBRTC_OFFER',
  SRV_WEBRTC_ANSWER = 'SRV_WEBRTC_ANSWER',
  SRV_WEBRTC_CANDIDATE = 'SRV_WEBRTC_CANDIDATE',
  SRV_WEBRTC_REJECTED = 'SRV_WEBRTC_REJECTED',
  SRV_WEBRTC_FINISH = 'SRV_WEBRTC_FINISH',
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
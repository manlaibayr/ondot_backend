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
  userFlower: number;
  verifyToken: string;
}

export enum UserType {
  ADMIN = 'ADMIN',
  USER = 'USER',
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
}

export enum ChatSocketMsgType {
  SRV_PREVIOUS_CHAT_LIST = 'SRV_PREVIOUS_CHAT_LIST',
  SRV_CONTACT_INFO = 'SRV_CONTACT_INFO',
  SRV_CONTACT_CHANGE = 'SRV_CONTACT_CHANGE',
  SRV_RECEIVE_MSG = 'SRV_RECEIVE_MSG'
}

export enum NotificationType {
  NOTE = 'NOTE',
  NOTE_ANSWER = 'NOTE_ANSWER',
  CHAT_REQUEST = 'CHAT_REQUEST',
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
}

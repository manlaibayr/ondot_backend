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

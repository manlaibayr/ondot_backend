// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-file-transfer
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {RequestHandler} from 'express-serve-static-core';
import {UserProfile} from '@loopback/security';

export type FileUploadHandler = RequestHandler;

export interface UserCredentials extends UserProfile{
  userId: string;
  username: string;
  userType: UserType;
  userFlower: number;
  verifyToken: string
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
  REQUEST = 'REQUEST',
  ALLOW = 'ALLOW',
  REJECT = 'REJECT',
  DELETE = 'DELETE',
}

export enum AdType {
  GOOGLE_AD = 'GOOGLE_AD',
  LINK = 'LINK',
}

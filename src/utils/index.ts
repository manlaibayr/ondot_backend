import {
  Request,
} from '@loopback/rest';
import fs from 'fs-extra';
import path from 'path';
import urlJoin from 'url-join';
import moment from 'moment';
import {CONFIG} from '../config';
import CryptoJs from 'crypto-js';
import * as crypto from "crypto";


export class Utils {

  public static getFilesAndFields(request: Request, saveFolder: string) {
    const uploadedFiles = request.files;
    const mapper = (f: globalThis.Express.Multer.File) => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      encoding: f.encoding,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path,
      filename: f.filename,
    });
    let files: object[] = [];
    if (Array.isArray(uploadedFiles)) {
      files = uploadedFiles.map(mapper);
    } else {
      for (const filename in uploadedFiles) {
        files.push(...uploadedFiles[filename].map(mapper));
      }
    }
    files.forEach((v: any) => {
      try {
        const savePath: string = path.join(CONFIG.uploadFolder, saveFolder);
        if (!fs.existsSync(savePath)) {
          fs.mkdirSync(savePath, {recursive: true});
        }
        const fileSavePath = path.join(savePath, v.filename);
        fs.moveSync(v.path, fileSavePath);
        v.path = fileSavePath;
        v.urlPath = urlJoin(saveFolder, v.filename);
      } catch (e) {
        console.error(e);
      }
    });
    return files;
  }

  public static getBetweenDate(year?: number, month?: number): [Date, Date] | undefined {
    if(!year) return;
    if(!month) {
      return [moment(`${year}-01-01`).startOf('year').toDate(), moment(`${year}-01-01`).endOf('year').toDate()];
    }
    return [moment(`${year}-${month}-01`).startOf('month').toDate(), moment(`${year}-${month}-01`).endOf('month').toDate()];
  }

  public static aes256Enc(planStr: string): string {
    const key = CryptoJs.enc.Utf8.parse(CONFIG.gifting.aesKey);
    const iv = CryptoJs.enc.Utf8.parse(CONFIG.gifting.aesIv);
    const encStr = CryptoJs.AES.encrypt(planStr, key, {iv: iv}).toString();
    return encStr;
  }

  public static aes256Dnc(encStr: string): string {
    const key = CryptoJs.enc.Utf8.parse(CONFIG.gifting.aesKey);
    const iv = CryptoJs.enc.Utf8.parse(CONFIG.gifting.aesIv);
    const planStr = JSON.parse(CryptoJs.AES.decrypt(encStr, key, {iv: iv}).toString(CryptoJs.enc.Latin1));
    return planStr;
  }

  public static rsaEnc(planStr: string): string {
    const encrypted = crypto.publicEncrypt({key: CONFIG.gifting.rsaPublicKey, padding: crypto.constants.RSA_PKCS1_PADDING}, Buffer.from(planStr));
    return encrypted.toString("base64");
  }

  public static rsaDnc(encStr: string): string {
    const decrypted = crypto.privateDecrypt({key: CONFIG.gifting.rsaPrivateKey, padding: crypto.constants.RSA_PKCS1_PADDING}, Buffer.from(encStr, "base64"));
    return decrypted.toString("utf8");
  }



}
import {
  Request,
} from '@loopback/rest';
import fs from 'fs-extra';
import path from 'path';
import urlJoin from 'url-join';
import {CONFIG} from '../config';
import moment from 'moment';


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

}
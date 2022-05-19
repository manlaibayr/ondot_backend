import {
  BindingScope,
  config,
  ContextTags,
  injectable,
  Provider,
} from '@loopback/core';
import multer from 'multer';
import path from 'path';
import {v4 as uuidv4} from 'uuid';
import {Request} from 'express-serve-static-core';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {FileUploadHandler} from '../types';
import {CONFIG} from '../config';

/**
 * A provider to return an `Express` request handler from `multer` middleware
 */
@injectable({
  scope: BindingScope.TRANSIENT,
  tags: {[ContextTags.KEY]: FILE_UPLOAD_SERVICE},
})
export class FileUploadProvider implements Provider<FileUploadHandler> {
  constructor(
    @config() private options: multer.Options = {}
  ) {
    if (!this.options.storage) {
      // Default to in-memory storage
      this.options.storage = multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, path.join(CONFIG.uploadFolder, 'tmp'));
        },
        filename: (req: Request, file: Express.Multer.File, cb: (error: (Error | null), filename: string) => void) => {
          cb(null, uuidv4() + path.extname(file.originalname))
        }
      });
    }
  }

  value(): FileUploadHandler {
    return multer(this.options).any();
  }
}
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { resolveUploadDir } from '../common/utils/storage-path.util';

export const multerOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, resolveUploadDir());
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname);
      callback(null, `${uuidv4()}${extension}`);
    },
  }),
};

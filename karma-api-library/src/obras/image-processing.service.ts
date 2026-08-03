import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { join } from 'path';
import { getUploadsDir } from '../data-paths';
const sharp: (input: string) => import('sharp').Sharp = require('sharp');

@Injectable()
export class ImageProcessingService {
  async optimize(obraId: string, sourceFilename: string, kind: 'cover' | 'spine' = 'cover') {
    const directory = join(getUploadsDir(), obraId);
    const source = join(directory, sourceFilename);
    const basename = randomUUID();
    const filename = `${basename}.webp`;
    const thumbnailFilename = `${basename}-thumb.webp`;
    const dimensions = kind === 'spine' ? { width: 700, height: 2200 } : { width: 1600, height: 2400 };
    try {
      await sharp(source)
        .rotate()
        .resize({ ...dimensions, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84, effort: 4 })
        .toFile(join(directory, filename));
      await sharp(source)
        .rotate()
        .resize({ width: kind === 'spine' ? 120 : 320, height: 480, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 72, effort: 3 })
        .toFile(join(directory, thumbnailFilename));
      return { filename, thumbnailFilename };
    } catch (error) {
      for (const generated of [filename, thumbnailFilename]) {
        const generatedPath = join(directory, generated);
        if (fs.existsSync(generatedPath)) fs.unlinkSync(generatedPath);
      }
      throw error;
    } finally {
      if (sourceFilename !== filename && fs.existsSync(source)) fs.unlinkSync(source);
    }
  }
}

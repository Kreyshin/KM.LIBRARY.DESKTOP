import { mkdirSync } from 'fs';
import { resolve, join } from 'path';

export function getDataDir() {
  const directory = resolve(process.env.KARMA_DATA_DIR || join(process.cwd(), 'data'));
  mkdirSync(directory, { recursive: true });
  return directory;
}

export function getUploadsDir() {
  const directory = join(getDataDir(), 'uploads');
  mkdirSync(directory, { recursive: true });
  return directory;
}

export function getDatabasePath() {
  return join(getDataDir(), 'library.sqlite').replace(/\\/g, '/');
}

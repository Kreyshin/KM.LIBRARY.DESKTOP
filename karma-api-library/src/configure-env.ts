import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getDataDir, getDatabasePath } from './data-paths';

const dataDir = getDataDir();
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = `file:${getDatabasePath()}`;
const secretFile = join(dataDir, '.jwt-secret');
if (!process.env.JWT_SECRET) {
  if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(48).toString('hex'), { mode: 0o600 });
  process.env.JWT_SECRET = readFileSync(secretFile, 'utf8').trim();
}

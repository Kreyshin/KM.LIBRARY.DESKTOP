import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { basename, join } from 'path';
import AdmZip = require('adm-zip');
import { PrismaService } from '../prisma/prisma.service';
import { getDataDir, getDatabasePath, getUploadsDir } from '../data-paths';

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  status() {
    return { ok: true, mode: process.env.KARMA_MODE || 'local', dataDir: getDataDir(), version: process.env.npm_package_version || '1.0.0' };
  }

  async createBackup() {
    await this.prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL)');
    const backupDir = join(getDataDir(), 'backups');
    mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `karma-library-${stamp}.zip`;
    const zip = new AdmZip();
    zip.addLocalFile(getDatabasePath(), '', 'library.sqlite');
    if (existsSync(getUploadsDir())) zip.addLocalFolder(getUploadsDir(), 'uploads');
    zip.addFile('metadata.json', Buffer.from(JSON.stringify({ format: 1, createdAt: new Date().toISOString() }, null, 2)));
    zip.writeZip(join(backupDir, name));
    return { name, downloadUrl: `/api/system/backups/${encodeURIComponent(name)}` };
  }

  backupPath(rawName: string) {
    const name = basename(rawName);
    const path = join(getDataDir(), 'backups', name);
    if (!name.endsWith('.zip') || !existsSync(path)) throw new NotFoundException('Respaldo no encontrado.');
    return path;
  }

  async restoreBackup(file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Selecciona un respaldo válido.');
    const zip = new AdmZip(file.buffer);
    const entries = zip.getEntries();
    if (!entries.some((entry) => entry.entryName === 'library.sqlite')) throw new BadRequestException('El respaldo no contiene library.sqlite.');
    if (entries.some((entry) => entry.entryName.includes('..') || /^[\\/]/.test(entry.entryName))) throw new BadRequestException('El respaldo contiene rutas no permitidas.');

    const staging = join(getDataDir(), `.restore-${Date.now()}`);
    mkdirSync(staging, { recursive: true });
    try {
      zip.extractAllTo(staging, true);
      await this.prisma.$disconnect();
      for (const suffix of ['', '-wal', '-shm']) {
        const target = `${getDatabasePath()}${suffix}`;
        if (existsSync(target)) rmSync(target, { force: true });
      }
      copyFileSync(join(staging, 'library.sqlite'), getDatabasePath());
      const uploads = getUploadsDir();
      rmSync(uploads, { recursive: true, force: true });
      mkdirSync(uploads, { recursive: true });
      const restoredUploads = join(staging, 'uploads');
      if (existsSync(restoredUploads)) cpSync(restoredUploads, uploads, { recursive: true });
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
    setTimeout(() => process.exit(42), 250);
    return { restored: true, restarting: true };
  }
}

import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import AdmZip = require('adm-zip');
import { PrismaService } from '../prisma/prisma.service';
import { getDataDir, getDatabasePath, getUploadsDir } from '../data-paths';
import { UpdateBackupSettingsDto } from './dto/update-backup-settings.dto';

interface BackupSettings {
  autoEnabled: boolean;
  intervalHours: number;
  retention: number;
  lastRunAt: string | null;
}

const DEFAULT_BACKUP_SETTINGS: BackupSettings = { autoEnabled: false, intervalHours: 24, retention: 10, lastRunAt: null };
const SCHEDULER_CHECK_MS = 15 * 60 * 1000;

@Injectable()
export class SystemService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}

  private schedulerTimer?: NodeJS.Timeout;

  onModuleInit() {
    this.schedulerTimer = setInterval(() => {
      void this.runScheduledBackupIfDue();
    }, SCHEDULER_CHECK_MS);
    setTimeout(() => void this.runScheduledBackupIfDue(), 60 * 1000);
  }

  onModuleDestroy() {
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
  }

  status() {
    return { ok: true, mode: process.env.KARMA_MODE || 'local', dataDir: getDataDir(), version: process.env.npm_package_version || '1.0.0' };
  }

  private backupsDir() {
    const dir = join(getDataDir(), 'backups');
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  private countDirectory(directory: string) {
    if (!existsSync(directory)) return { files: 0, bytes: 0 };
    const pending = [directory];
    let files = 0;
    let bytes = 0;
    while (pending.length) {
      const current = pending.pop() as string;
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const entryPath = join(current, entry.name);
        if (entry.isDirectory()) pending.push(entryPath);
        else if (entry.isFile()) { files += 1; bytes += statSync(entryPath).size; }
      }
    }
    return { files, bytes };
  }

  async createBackup() {
    await this.prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL)');
    const backupDir = this.backupsDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `karma-library-${stamp}.zip`;
    const dbBytes = statSync(getDatabasePath()).size;
    const uploadsInfo = this.countDirectory(getUploadsDir());
    const zip = new AdmZip();
    zip.addLocalFile(getDatabasePath(), '', 'library.sqlite');
    if (existsSync(getUploadsDir())) zip.addLocalFolder(getUploadsDir(), 'uploads');
    zip.addFile('metadata.json', Buffer.from(JSON.stringify({
      format: 2,
      createdAt: new Date().toISOString(),
      dbBytes,
      uploadsFiles: uploadsInfo.files,
      uploadsBytes: uploadsInfo.bytes,
    }, null, 2)));
    zip.writeZip(join(backupDir, name));
    this.pruneBackups(this.getBackupSettings().retention);
    return { name, downloadUrl: `/api/system/backups/${encodeURIComponent(name)}` };
  }

  listBackups() {
    const dir = this.backupsDir();
    return readdirSync(dir)
      .filter((entry) => entry.endsWith('.zip'))
      .map((name) => {
        const stat = statSync(join(dir, name));
        return { name, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private pruneBackups(retention: number) {
    const excess = this.listBackups().slice(Math.max(retention, 0));
    for (const backup of excess) rmSync(join(this.backupsDir(), backup.name), { force: true });
  }

  backupPath(rawName: string) {
    const name = basename(rawName);
    const path = join(this.backupsDir(), name);
    if (!name.endsWith('.zip') || !existsSync(path)) throw new NotFoundException('Respaldo no encontrado.');
    return path;
  }

  deleteBackup(rawName: string) {
    const path = this.backupPath(rawName);
    rmSync(path, { force: true });
    return { deleted: true, name: basename(rawName) };
  }

  verifyBackup(rawName: string) {
    const path = this.backupPath(rawName);
    const issues: string[] = [];
    const zip = new AdmZip(path);
    const entries = zip.getEntries();

    if (entries.some((entry) => entry.entryName.includes('..') || /^[\\/]/.test(entry.entryName))) {
      issues.push('El respaldo contiene rutas no permitidas.');
    }

    const sqliteEntry = entries.find((entry) => entry.entryName === 'library.sqlite');
    if (!sqliteEntry) {
      issues.push('No contiene library.sqlite.');
    } else {
      const header = sqliteEntry.getData().subarray(0, 16).toString('utf8');
      if (!header.startsWith('SQLite format 3')) issues.push('library.sqlite no tiene un encabezado SQLite válido.');
    }

    let metadata: { dbBytes?: number; uploadsFiles?: number; uploadsBytes?: number } = {};
    const metadataEntry = entries.find((entry) => entry.entryName === 'metadata.json');
    if (metadataEntry) {
      try { metadata = JSON.parse(metadataEntry.getData().toString('utf8')); } catch { issues.push('metadata.json no se pudo leer.'); }
    }

    if (sqliteEntry && typeof metadata.dbBytes === 'number' && sqliteEntry.header.size !== metadata.dbBytes) {
      issues.push('El tamaño de library.sqlite no coincide con lo registrado al crear el respaldo.');
    }

    const uploadEntries = entries.filter((entry) => entry.entryName.startsWith('uploads/') && !entry.isDirectory);
    const uploadsBytes = uploadEntries.reduce((total, entry) => total + entry.header.size, 0);
    if (typeof metadata.uploadsFiles === 'number' && uploadEntries.length !== metadata.uploadsFiles) {
      issues.push('La cantidad de imágenes no coincide con lo registrado al crear el respaldo.');
    }
    if (typeof metadata.uploadsBytes === 'number' && uploadsBytes !== metadata.uploadsBytes) {
      issues.push('El peso de las imágenes no coincide con lo registrado al crear el respaldo.');
    }

    return { ok: issues.length === 0, issues, checkedAt: new Date().toISOString(), entryCount: entries.length };
  }

  async restoreBackup(file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Selecciona un respaldo válido.');
    return this.restoreFromZip(new AdmZip(file.buffer));
  }

  async restoreBackupByName(rawName: string) {
    return this.restoreFromZip(new AdmZip(this.backupPath(rawName)));
  }

  private async restoreFromZip(zip: AdmZip) {
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

  private settingsPath() {
    return join(getDataDir(), 'backup-settings.json');
  }

  getBackupSettings(): BackupSettings {
    try {
      const raw = JSON.parse(readFileSync(this.settingsPath(), 'utf8'));
      return { ...DEFAULT_BACKUP_SETTINGS, ...raw };
    } catch {
      return { ...DEFAULT_BACKUP_SETTINGS };
    }
  }

  updateBackupSettings(patch: UpdateBackupSettingsDto): BackupSettings {
    const next = { ...this.getBackupSettings(), ...patch };
    writeFileSync(this.settingsPath(), JSON.stringify(next, null, 2));
    return next;
  }

  private setLastRunNow() {
    const next = { ...this.getBackupSettings(), lastRunAt: new Date().toISOString() };
    writeFileSync(this.settingsPath(), JSON.stringify(next, null, 2));
  }

  private async runScheduledBackupIfDue() {
    const settings = this.getBackupSettings();
    if (!settings.autoEnabled) return;
    const last = settings.lastRunAt ? new Date(settings.lastRunAt).getTime() : 0;
    const dueAt = last + settings.intervalHours * 3600 * 1000;
    if (Date.now() < dueAt) return;
    try {
      await this.createBackup();
    } finally {
      this.setLastRunNow();
    }
  }
}

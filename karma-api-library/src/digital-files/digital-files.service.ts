import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, renameSync, rmSync } from 'fs';
import { extname, join } from 'path';
import AdmZip = require('adm-zip');
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { getUploadsDir } from '../data-paths';
import { UpdateDigitalProgressDto } from './dto/update-digital-progress.dto';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

@Injectable()
export class DigitalFilesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getVolume(obraId: string, number: number) {
    const volume = await this.prisma.volume.findFirst({ where: { obraId, number } });
    if (!volume) throw new NotFoundException('Tomo no encontrado.');
    return volume;
  }

  private async getFile(obraId: string, number: number, fileId: string) {
    const volume = await this.getVolume(obraId, number);
    const file = await this.prisma.digitalFile.findFirst({ where: { id: fileId, volumeId: volume.id } });
    if (!file) throw new NotFoundException('Archivo digital no encontrado.');
    return file;
  }

  async list(obraId: string, number: number) {
    const volume = await this.getVolume(obraId, number);
    return this.prisma.digitalFile.findMany({ where: { volumeId: volume.id }, orderBy: { createdAt: 'asc' } });
  }

  async upload(obraId: string, number: number, files: Express.Multer.File[], label?: string) {
    if (!files?.length) throw new BadRequestException('Selecciona al menos un archivo.');
    const volume = await this.getVolume(obraId, number);
    const fileId = uuid();
    const dir = join(getUploadsDir(), obraId, 'digital', fileId);
    mkdirSync(dir, { recursive: true });

    try {
      const isSingleDocument = files.length === 1 && !IMAGE_EXTENSIONS.includes(extname(files[0].originalname).toLowerCase());
      if (isSingleDocument) {
        return await this.storeDocument(obraId, volume.id, dir, fileId, files[0], label);
      }
      return await this.storeImageFolder(obraId, volume.id, dir, fileId, files, label);
    } catch (error) {
      rmSync(dir, { recursive: true, force: true });
      throw error;
    }
  }

  private async storeDocument(obraId: string, volumeId: string, dir: string, fileId: string, file: Express.Multer.File, label?: string) {
    const ext = extname(file.originalname).toLowerCase();
    const kinds: Record<string, { mediaType: string; format: string }> = {
      '.epub': { mediaType: 'EPUB', format: 'epub' },
      '.pdf': { mediaType: 'PDF', format: 'pdf' },
      '.cbz': { mediaType: 'CBZ', format: 'cbz' },
      '.zip': { mediaType: 'CBZ', format: 'cbz' },
    };
    const kind = kinds[ext];
    if (!kind) {
      if (ext === '.cbr' || ext === '.rar') throw new BadRequestException('Los archivos CBR/RAR no son compatibles todavía. Usa CBZ (ZIP) en su lugar.');
      throw new BadRequestException('Formato no compatible. Usa EPUB, PDF, CBZ o imágenes.');
    }

    const destName = `original${ext}`;
    renameSync(file.path, join(dir, destName));
    const storedPath = `/uploads/${obraId}/digital/${fileId}/${destName}`;

    let pageCount: number | null = null;
    if (kind.mediaType === 'CBZ') {
      try {
        const zip = new AdmZip(join(dir, destName));
        pageCount = zip.getEntries().filter((entry) => !entry.isDirectory && IMAGE_EXTENSIONS.includes(extname(entry.entryName).toLowerCase())).length;
      } catch {
        pageCount = null;
      }
    }

    return this.prisma.digitalFile.create({
      data: {
        id: fileId,
        label: label?.trim() || null,
        originalName: file.originalname,
        storedPath,
        mediaType: kind.mediaType,
        format: kind.format,
        sizeBytes: file.size,
        pageCount,
        manifestJson: '[]',
        volumeId,
      },
    });
  }

  private async storeImageFolder(obraId: string, volumeId: string, dir: string, fileId: string, files: Express.Multer.File[], label?: string) {
    const invalid = files.find((file) => !IMAGE_EXTENSIONS.includes(extname(file.originalname).toLowerCase()));
    if (invalid) throw new BadRequestException(`"${invalid.originalname}" no es una imagen compatible.`);

    const sorted = [...files].sort((a, b) => a.originalname.localeCompare(b.originalname, undefined, { numeric: true }));
    let sizeBytes = 0;
    const manifest = sorted.map((file, index) => {
      const ext = extname(file.originalname).toLowerCase();
      const pageName = `${String(index + 1).padStart(4, '0')}${ext}`;
      renameSync(file.path, join(dir, pageName));
      sizeBytes += file.size;
      return `/uploads/${obraId}/digital/${fileId}/${pageName}`;
    });

    return this.prisma.digitalFile.create({
      data: {
        id: fileId,
        label: label?.trim() || null,
        originalName: `${files.length} imágenes`,
        storedPath: manifest[0] ?? '',
        mediaType: 'IMAGE_FOLDER',
        format: 'images',
        sizeBytes,
        pageCount: manifest.length,
        manifestJson: JSON.stringify(manifest),
        volumeId,
      },
    });
  }

  async appendPages(obraId: string, number: number, fileId: string, files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Selecciona al menos una imagen.');
    const file = await this.getFile(obraId, number, fileId);
    if (file.mediaType !== 'IMAGE_FOLDER') throw new BadRequestException('Solo se pueden agregar páginas a un archivo de imágenes.');

    const invalid = files.find((item) => !IMAGE_EXTENSIONS.includes(extname(item.originalname).toLowerCase()));
    if (invalid) {
      files.forEach((item) => rmSync(item.path, { force: true }));
      throw new BadRequestException(`"${invalid.originalname}" no es una imagen compatible.`);
    }

    const dir = join(getUploadsDir(), obraId, 'digital', file.id);
    const manifest: string[] = JSON.parse(file.manifestJson || '[]');
    let nextIndex = manifest.length;
    let addedBytes = 0;

    const sorted = [...files].sort((a, b) => a.originalname.localeCompare(b.originalname, undefined, { numeric: true }));
    for (const item of sorted) {
      nextIndex += 1;
      const ext = extname(item.originalname).toLowerCase();
      const pageName = `${String(nextIndex).padStart(4, '0')}${ext}`;
      renameSync(item.path, join(dir, pageName));
      addedBytes += item.size;
      manifest.push(`/uploads/${obraId}/digital/${file.id}/${pageName}`);
    }

    return this.prisma.digitalFile.update({
      where: { id: file.id },
      data: {
        manifestJson: JSON.stringify(manifest),
        pageCount: manifest.length,
        sizeBytes: file.sizeBytes + addedBytes,
        storedPath: manifest[0],
      },
    });
  }

  async reorderPages(obraId: string, number: number, fileId: string, order: string[]) {
    const file = await this.getFile(obraId, number, fileId);
    if (file.mediaType !== 'IMAGE_FOLDER') throw new BadRequestException('Solo se puede reordenar un archivo de imágenes.');

    const current = new Set<string>(JSON.parse(file.manifestJson || '[]'));
    const next = new Set(order);
    if (current.size !== next.size || [...current].some((url) => !next.has(url))) {
      throw new BadRequestException('El nuevo orden no coincide con las páginas actuales.');
    }

    return this.prisma.digitalFile.update({
      where: { id: file.id },
      data: { manifestJson: JSON.stringify(order), storedPath: order[0] },
    });
  }

  async remove(obraId: string, number: number, fileId: string) {
    const file = await this.getFile(obraId, number, fileId);
    const dir = join(getUploadsDir(), obraId, 'digital', file.id);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    await this.prisma.digitalFile.delete({ where: { id: file.id } });
    return { deleted: true };
  }

  async getProgress(obraId: string, number: number, fileId: string, readerId: string) {
    await this.getFile(obraId, number, fileId);
    const progress = await this.prisma.digitalProgress.findUnique({ where: { readerId_fileId: { readerId, fileId } } });
    return progress || { currentPage: 1, totalPages: null, percent: 0, locator: null };
  }

  async saveProgress(obraId: string, number: number, fileId: string, readerId: string, dto: UpdateDigitalProgressDto) {
    await this.getFile(obraId, number, fileId);
    return this.prisma.digitalProgress.upsert({
      where: { readerId_fileId: { readerId, fileId } },
      create: { readerId, fileId, currentPage: dto.currentPage ?? 1, totalPages: dto.totalPages, percent: dto.percent ?? 0, locator: dto.locator },
      update: dto,
    });
  }
}

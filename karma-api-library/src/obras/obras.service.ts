import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseStringArray, stringifyStringArray } from '../domain/constants';
import { CreateObraDto } from './dto/create-obra.dto';
import { UpdateObraDto } from './dto/update-obra.dto';
import { UpdateVolumeDto } from './dto/update-volume.dto';
import {
  CreateVolumeCoverVariantDto,
  UpdateVolumeCoverVariantDto,
} from './dto/volume-cover-variant.dto';
import * as fs from 'fs';
import * as path from 'path';
import { getUploadsDir } from '../data-paths';

const volumeInclude = {
  alternateCovers: {
    orderBy: [
      { isPrimary: 'desc' as const },
      { createdAt: 'asc' as const },
    ],
  },
};

const obraInclude = {
  genreLinks: {
    include: { genre: true },
    orderBy: { genre: { name: 'asc' as const } },
  },
  volumes: {
    orderBy: { number: 'asc' as const },
    include: volumeInclude,
  },
};

@Injectable()
export class ObrasService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const obras = await this.prisma.obra.findMany({
      include: obraInclude,
      orderBy: { createdAt: 'asc' },
    });
    return obras.map((obra) => this.serializeObra(obra));
  }

  async findOne(id: string) {
    const obra = await this.prisma.obra.findUnique({
      where: { id },
      include: obraInclude,
    });

    if (!obra) throw new NotFoundException('Obra no encontrada');
    return this.serializeObra(obra);
  }

  async create(dto: CreateObraDto) {
    const total = dto.totalVolumes ?? 0;
    const { totalVolumes, genres = [], tags = [], ...data } = dto;
    const genreIds = await this.resolveGenreIds(genres);

    const demographic = ['MANGA', 'MANHWA', 'MANHUA'].includes(data.tipo || 'MANGA') ? data.demographic : null;
    return this.prisma.obra.create({
      data: {
        ...data,
        tagsJson: stringifyStringArray(tags),
        demographic,
        genreLinks: {
          create: genreIds.map((genreId) => ({ genre: { connect: { id: genreId } } })),
        },
        volumes: {
          create: Array.from({ length: total }, (_, index) => ({
            number: index + 1,
            ownership: 'NOT_OWNED',
          })),
        },
      },
      include: obraInclude,
    }).then((obra) => this.serializeObra(obra));
  }

  async update(id: string, dto: UpdateObraDto) {
    const current = await this.findOne(id);
    const { totalVolumes, genres, tags, ...data } = dto;
    const targetFormat = data.tipo || current.tipo;
    const genreIds = genres === undefined ? undefined : await this.resolveGenreIds(genres);

    return this.prisma.obra.update({
      where: { id },
      data: {
        ...data,
        tagsJson: stringifyStringArray(tags),
        demographic: ['MANGA', 'MANHWA', 'MANHUA'].includes(targetFormat) ? data.demographic : null,
        genreLinks: genreIds === undefined ? undefined : {
          deleteMany: {},
          create: genreIds.map((genreId) => ({ genre: { connect: { id: genreId } } })),
        },
      },
      include: obraInclude,
    }).then((obra) => this.serializeObra(obra));
  }

  async remove(id: string) {
    await this.findOne(id);
    const dir = path.join(getUploadsDir(), id);

    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    await this.prisma.obra.delete({ where: { id } });
    return { deleted: true };
  }

  async resizeVolumes(id: string, total: number) {
    const obra = await this.findOne(id);
    const current = obra.volumes;

    if (total > current.length) {
      const toCreate = Array.from(
        { length: total - current.length },
        (_, index) => ({
          number: current.length + index + 1,
          obraId: id,
          ownership: 'NOT_OWNED',
        }),
      );

      await this.prisma.volume.createMany({ data: toCreate });
    } else if (total < current.length) {
      const removed = current.filter((volume) => volume.number > total);

      removed.forEach((volume) => {
        this.deleteCoverFile(id, volume.coverPath);
        this.deleteCoverFile(id, volume.thumbnailPath);
        this.deleteCoverFile(id, volume.spinePath);
        volume.alternateCovers.forEach((cover) => {
          this.deleteCoverFile(id, cover.path);
          this.deleteCoverFile(id, cover.thumbnailPath);
          this.deleteCoverFile(id, cover.spinePath);
        });
      });

      await this.prisma.volume.deleteMany({
        where: {
          obraId: id,
          number: { in: removed.map((volume) => volume.number) },
        },
      });
    }

    return this.findOne(id);
  }

  async addVolume(id: string) {
    const obra = await this.findOne(id);
    const nextNumber = obra.volumes.length
      ? Math.max(...obra.volumes.map((volume) => volume.number)) + 1
      : 1;

    await this.prisma.volume.create({
      data: { number: nextNumber, obraId: id, ownership: 'NOT_OWNED' },
    });

    return this.findOne(id);
  }

  async removeVolume(id: string, number: number) {
    const volume = await this.getVolume(id, number);

    this.deleteCoverFile(id, volume.coverPath);
    this.deleteCoverFile(id, volume.thumbnailPath);
    this.deleteCoverFile(id, volume.spinePath);
    volume.alternateCovers.forEach((cover) => {
      this.deleteCoverFile(id, cover.path);
      this.deleteCoverFile(id, cover.thumbnailPath);
      this.deleteCoverFile(id, cover.spinePath);
    });

    await this.prisma.volume.delete({ where: { id: volume.id } });
    return this.findOne(id);
  }

  async updateVolume(id: string, number: number, dto: UpdateVolumeDto) {
    const volume = await this.getVolume(id, number);

    return this.prisma.volume.update({
      where: { id: volume.id },
      data: {
        ...dto,
        startDate: this.toOptionalDate(dto.startDate),
        finishDate: this.toOptionalDate(dto.finishDate),
        publishDate: this.toOptionalDate(dto.publishDate),
      },
      include: volumeInclude,
    });
  }

  async saveObraCover(id: string, filename: string, thumbnailFilename: string) {
    const obra = await this.findOne(id);
    this.deleteCoverFile(id, obra.coverPath);
    this.deleteCoverFile(id, obra.thumbnailPath);

    return this.prisma.obra.update({
      where: { id },
      data: { coverPath: `/uploads/${id}/${filename}`, thumbnailPath: `/uploads/${id}/${thumbnailFilename}` },
      include: obraInclude,
    }).then((updated) => this.serializeObra(updated));
  }

  async saveVolumeCover(id: string, number: number, filename: string, thumbnailFilename: string) {
    const volume = await this.getVolume(id, number);
    this.deleteCoverFile(id, volume.coverPath);
    this.deleteCoverFile(id, volume.thumbnailPath);

    return this.prisma.volume.update({
      where: { id: volume.id },
      data: { coverPath: `/uploads/${id}/${filename}`, thumbnailPath: `/uploads/${id}/${thumbnailFilename}` },
      include: volumeInclude,
    });
  }

  async saveVolumeSpine(id: string, number: number, filename: string) {
    const volume = await this.getVolume(id, number);
    this.deleteCoverFile(id, volume.spinePath);

    return this.prisma.volume.update({
      where: { id: volume.id },
      data: { spinePath: `/uploads/${id}/${filename}` },
      include: volumeInclude,
    });
  }

  async saveVolumeAlternateCover(
    id: string,
    number: number,
    filename: string,
    thumbnailFilename: string,
    dto: CreateVolumeCoverVariantDto,
  ) {
    const volume = await this.getVolume(id, number);
    await this.assertUniqueIsbn(dto.isbn);
    const pathValue = `/uploads/${id}/${filename}`;

    return this.prisma.$transaction(async (transaction) => {
      if (dto.isPrimary) {
        await transaction.volumeCoverVariant.updateMany({
          where: { volumeId: volume.id },
          data: { isPrimary: false },
        });
      }

      await transaction.volumeCoverVariant.create({
        data: {
          path: pathValue,
          thumbnailPath: `/uploads/${id}/${thumbnailFilename}`,
          language: dto.language,
          publisher: dto.publisher,
          edition: dto.edition,
          country: dto.country,
          isbn: dto.isbn,
          publishDate: this.toOptionalDate(dto.publishDate),
          editionType: dto.editionType,
          label: dto.label,
          isPrimary: dto.isPrimary ?? false,
          volumeId: volume.id,
        },
      });

      return transaction.volume.findUniqueOrThrow({
        where: { id: volume.id },
        include: volumeInclude,
      });
    });
  }

  async updateVolumeAlternateCover(
    id: string,
    number: number,
    coverId: string,
    dto: UpdateVolumeCoverVariantDto,
  ) {
    const volume = await this.getVolume(id, number);
    const cover = this.findAlternateCover(volume, coverId);
    await this.assertUniqueIsbn(dto.isbn, coverId);

    return this.prisma.$transaction(async (transaction) => {
      if (dto.isPrimary) {
        await transaction.volumeCoverVariant.updateMany({
          where: {
            volumeId: volume.id,
            id: { not: cover.id },
          },
          data: { isPrimary: false },
        });
      }

      await transaction.volumeCoverVariant.update({
        where: { id: cover.id },
        data: {
          ...dto,
          publishDate: this.toOptionalDate(dto.publishDate),
        },
      });

      return transaction.volume.findUniqueOrThrow({
        where: { id: volume.id },
        include: volumeInclude,
      });
    });
  }

  async replaceVolumeAlternateCover(id: string, number: number, coverId: string, filename: string, thumbnailFilename: string) {
    const volume = await this.getVolume(id, number);
    const cover = this.findAlternateCover(volume, coverId);
    this.deleteCoverFile(id, cover.path);
    this.deleteCoverFile(id, cover.thumbnailPath || null);
    return this.prisma.volume.update({
      where: { id: volume.id },
      data: { alternateCovers: { update: { where: { id: coverId }, data: { path: `/uploads/${id}/${filename}`, thumbnailPath: `/uploads/${id}/${thumbnailFilename}` } } } },
      include: volumeInclude,
    });
  }

  async saveVolumeAlternateSpine(id: string, number: number, coverId: string, filename: string) {
    const volume = await this.getVolume(id, number);
    const cover = this.findAlternateCover(volume, coverId);
    this.deleteCoverFile(id, cover.spinePath || null);
    return this.prisma.volume.update({
      where: { id: volume.id },
      data: { alternateCovers: { update: { where: { id: coverId }, data: { spinePath: `/uploads/${id}/${filename}` } } } },
      include: volumeInclude,
    });
  }

  async removeVolumeAlternateCover(
    id: string,
    number: number,
    coverId: string,
  ) {
    const volume = await this.getVolume(id, number);
    const cover = this.findAlternateCover(volume, coverId);

    await this.prisma.volumeCoverVariant.delete({
      where: { id: cover.id },
    });

    this.deleteCoverFile(id, cover.path);
    this.deleteCoverFile(id, cover.thumbnailPath || null);
    this.deleteCoverFile(id, cover.spinePath || null);

    return this.prisma.volume.findUniqueOrThrow({
      where: { id: volume.id },
      include: volumeInclude,
    });
  }

  async setPrimaryVolumeCover(
    id: string,
    number: number,
    coverId: string | null,
  ) {
    const volume = await this.getVolume(id, number);

    if (coverId) {
      this.findAlternateCover(volume, coverId);
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.volumeCoverVariant.updateMany({
        where: { volumeId: volume.id },
        data: { isPrimary: false },
      });

      if (coverId) {
        await transaction.volumeCoverVariant.update({
          where: { id: coverId },
          data: { isPrimary: true },
        });
      }

      return transaction.volume.findUniqueOrThrow({
        where: { id: volume.id },
        include: volumeInclude,
      });
    });
  }

  private async getVolume(id: string, number: number) {
    const obra = await this.findOne(id);
    const volume = obra.volumes.find((item) => item.number === number);

    if (!volume) {
      throw new NotFoundException('Tomo no encontrado');
    }

    return volume;
  }

  private findAlternateCover(
    volume: {
      alternateCovers: Array<{
        id: string;
        path: string;
        thumbnailPath?: string | null;
        spinePath?: string | null;
        isPrimary: boolean;
      }>;
    },
    coverId: string,
  ) {
    const cover = volume.alternateCovers.find(
      (item) => item.id === coverId,
    );

    if (!cover) {
      throw new NotFoundException('Portada alternativa no encontrada');
    }

    return cover;
  }

  private toOptionalDate(value: string | null | undefined) {
    if (value === null) return null;
    return value ? new Date(value) : undefined;
  }

  private async assertUniqueIsbn(isbn: string | null | undefined, coverId?: string) {
    const normalized = isbn?.trim();
    if (!normalized) return;
    const [variant, volume] = await Promise.all([
      this.prisma.volumeCoverVariant.findFirst({ where: { isbn: normalized, ...(coverId ? { id: { not: coverId } } : {}) }, select: { id: true } }),
      this.prisma.volume.findFirst({ where: { isbn: normalized }, select: { id: true } }),
    ]);
    if (variant || volume) throw new ConflictException('Ese ISBN ya está registrado en otra edición o tomo.');
  }

  private async resolveGenreIds(names: string[]) {
    const normalized = [...new Set(names.map((name) => this.canonicalGenreName(name)).filter(Boolean))];
    if (!normalized.length) return [];

    const genres = await Promise.all(normalized.map(async (name) => {
      const existing = await this.prisma.genre.findUnique({ where: { slug: this.slugify(name) } });
      if (existing) return existing;
      const baseSlug = this.slugify(name) || 'genero';
      let slug = baseSlug;
      let suffix = 2;
      while (await this.prisma.genre.findUnique({ where: { slug } })) slug = `${baseSlug}-${suffix++}`;
      return this.prisma.genre.create({ data: { name, slug, isStandard: false } });
    }));
    return genres.map((genre) => genre.id);
  }

  private slugify(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private canonicalGenreName(raw: string) {
    const name = raw.trim().replace(/\s+/g, ' ');
    const key = this.slugify(name);
    if (['shonen', 'shounen', 'shojo', 'shoujo', 'seinen', 'josei', 'kodomo'].includes(key)) {
      throw new BadRequestException(`“${name}” es una demografía y debe seleccionarse en su campo correspondiente.`);
    }
    const aliases: Record<string, string> = {
      accion: 'Acción', 'ciencia-ficcion': 'Ciencia ficción', fantasia: 'Fantasía',
      historico: 'Ficción histórica', 'vida-cotidiana': 'Ficción contemporánea',
    };
    return aliases[key] || name;
  }

  private serializeObra<T extends { genreLinks?: Array<{ genre: { name: string } }>; tagsJson?: string }>(obra: T) {
    const { genreLinks = [], tagsJson, ...data } = obra;
    return { ...data, tags: parseStringArray(tagsJson), genres: genreLinks.map((link) => link.genre.name) };
  }

  private deleteCoverFile(obraId: string, coverPath: string | null) {
    if (!coverPath) return;

    const file = path.join(
      getUploadsDir(),
      obraId,
      path.basename(coverPath),
    );

    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
}

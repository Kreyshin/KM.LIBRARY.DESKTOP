import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGenreDto, UpdateGenreDto } from './dto/create-genre.dto';

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.genre.findMany({ orderBy: [{ isStandard: 'desc' }, { name: 'asc' }] });
  }

  async create(dto: CreateGenreDto) {
    const name = this.canonicalName(dto.name);
    const slug = this.slugify(name);
    const existing = await this.prisma.genre.findFirst({ where: { OR: [{ slug }, { name }] } });
    if (existing) return existing;
    try {
      return await this.prisma.genre.create({ data: { name, slug, isStandard: false } });
    } catch {
      throw new ConflictException('Ese género ya existe en el catálogo.');
    }
  }

  async update(id: string, dto: UpdateGenreDto) {
    const genre = await this.prisma.genre.findUnique({ where: { id } });
    if (!genre) throw new NotFoundException('Género no encontrado.');
    if (genre.isStandard) throw new BadRequestException('Los géneros estándar no se pueden renombrar.');
    const name = this.canonicalName(dto.name);
    const slug = this.slugify(name);
    const duplicate = await this.prisma.genre.findFirst({ where: { id: { not: id }, OR: [{ slug }, { name }] } });
    if (duplicate) throw new ConflictException('Ese género ya existe; puedes fusionar ambos registros.');
    return this.prisma.genre.update({ where: { id }, data: { name, slug } });
  }

  async merge(id: string, targetId: string) {
    if (id === targetId) throw new BadRequestException('Selecciona dos géneros diferentes.');
    const [source, target] = await Promise.all([
      this.prisma.genre.findUnique({ where: { id }, include: { obras: true } }),
      this.prisma.genre.findUnique({ where: { id: targetId } }),
    ]);
    if (!source || !target) throw new NotFoundException('No se encontró uno de los géneros.');
    await this.prisma.$transaction(async (transaction) => {
      await Promise.all(source.obras.map((link) => transaction.obraGenre.upsert({
        where: { obraId_genreId: { obraId: link.obraId, genreId: targetId } },
        create: { obraId: link.obraId, genreId: targetId },
        update: {},
      })));
      await transaction.genre.delete({ where: { id } });
    });
    return this.prisma.genre.findUniqueOrThrow({ where: { id: targetId } });
  }

  private canonicalName(raw: string) {
    const name = raw.trim().replace(/\s+/g, ' ');
    const key = this.slugify(name);
    if (['shonen', 'shounen', 'shojo', 'shoujo', 'seinen', 'josei', 'kodomo'].includes(key)) {
      throw new BadRequestException('Ese valor es una demografía. Selecciónalo en el campo Demografía.');
    }
    const aliases: Record<string, string> = {
      accion: 'Acción', 'ciencia-ficcion': 'Ciencia ficción', fantasia: 'Fantasía',
      historico: 'Ficción histórica', 'vida-cotidiana': 'Ficción contemporánea',
    };
    return aliases[key] || name;
  }

  private slugify(name: string) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}

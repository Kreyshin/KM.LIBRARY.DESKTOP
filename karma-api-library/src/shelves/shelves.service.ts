import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddShelfItemDto, CreateShelfDto, ReorderShelfItemsDto, UpdateShelfDto } from './dto/shelf.dto';

const obraInclude = {
  volumes: { orderBy: { number: 'asc' as const }, include: { alternateCovers: true } },
};

@Injectable()
export class ShelvesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(readerId: string) {
    const custom = await this.prisma.shelf.findMany({
      where: { readerId, smartType: null },
      include: { items: { orderBy: { position: 'asc' }, include: { obra: { include: obraInclude } } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    const smartDefinitions = [
      { type: 'PURCHASE_LIST', name: 'Lista de compra', description: 'Tomos que todavía no has adquirido', color: '#FBBF24', where: { volumes: { some: { ownership: 'NOT_OWNED' as const } } } },
      { type: 'UNREAD', name: 'Pendientes de lectura', description: 'Obras con tomos aún no leídos', color: '#60A5FA', where: { volumes: { some: { read: false } } } },
      { type: 'FAVORITES', name: 'Favoritos', description: 'Tus historias imprescindibles', color: '#F472B6', where: { favorite: true } },
      { type: 'IN_PROGRESS', name: 'Leyendo ahora', description: 'Lecturas que tienes en progreso', color: '#9F6BFF', where: { status: 'READING' as const } },
      { type: 'OWNED', name: 'Colección adquirida', description: 'Obras con al menos un tomo físico o digital', color: '#34D399', where: { volumes: { some: { ownership: { not: 'NOT_OWNED' as const } } } } },
    ];
    const smart = await Promise.all(smartDefinitions.map(async (definition) => ({
      id: `smart:${definition.type}`,
      name: definition.name,
      description: definition.description,
      color: definition.color,
      smartType: definition.type,
      items: (await this.prisma.obra.findMany({ where: definition.where, include: obraInclude, orderBy: { titulo: 'asc' } }))
        .map((obra, position) => ({ id: `smart:${definition.type}:${obra.id}`, position, obraId: obra.id, obra })),
    })));
    return { custom, smart };
  }

  async create(readerId: string, dto: CreateShelfDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.shelf.findFirst({ where: { readerId, name } });
    if (existing) throw new ConflictException('Ya tienes una estantería con ese nombre.');
    const count = await this.prisma.shelf.count({ where: { readerId, smartType: null } });
    return this.prisma.shelf.create({ data: { readerId, name, description: dto.description?.trim() || null, color: dto.color || '#9F6BFF', position: count }, include: { items: true } });
  }

  async update(readerId: string, id: string, dto: UpdateShelfDto) {
    await this.ownedShelf(readerId, id);
    return this.prisma.shelf.update({ where: { id }, data: { ...dto, name: dto.name?.trim(), description: dto.description === undefined ? undefined : dto.description.trim() || null } });
  }

  async remove(readerId: string, id: string) {
    await this.ownedShelf(readerId, id);
    await this.prisma.shelf.delete({ where: { id } });
    return { deleted: true };
  }

  async addItem(readerId: string, id: string, dto: AddShelfItemDto) {
    await this.ownedShelf(readerId, id);
    const obra = await this.prisma.obra.findUnique({ where: { id: dto.obraId } });
    if (!obra) throw new NotFoundException('Obra no encontrada.');
    const count = await this.prisma.shelfItem.count({ where: { shelfId: id } });
    try {
      await this.prisma.shelfItem.create({ data: { shelfId: id, obraId: dto.obraId, position: count } });
    } catch { throw new ConflictException('La obra ya está en esta estantería.'); }
    return this.getShelf(readerId, id);
  }

  async removeItem(readerId: string, id: string, obraId: string) {
    await this.ownedShelf(readerId, id);
    await this.prisma.shelfItem.deleteMany({ where: { shelfId: id, obraId } });
    return this.getShelf(readerId, id);
  }

  async reorder(readerId: string, id: string, dto: ReorderShelfItemsDto) {
    await this.ownedShelf(readerId, id);
    await this.prisma.$transaction(dto.obraIds.map((obraId, position) => this.prisma.shelfItem.updateMany({ where: { shelfId: id, obraId }, data: { position } })));
    return this.getShelf(readerId, id);
  }

  private async getShelf(readerId: string, id: string) {
    return this.prisma.shelf.findFirstOrThrow({ where: { id, readerId }, include: { items: { orderBy: { position: 'asc' }, include: { obra: { include: obraInclude } } } } });
  }

  private async ownedShelf(readerId: string, id: string) {
    const shelf = await this.prisma.shelf.findFirst({ where: { id, readerId, smartType: null } });
    if (!shelf) throw new NotFoundException('Estantería no encontrada.');
    return shelf;
  }
}

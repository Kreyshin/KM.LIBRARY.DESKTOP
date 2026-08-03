import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReadingSessionDto, UpdateReadingSessionDto } from './dto/reading-session.dto';

const sessionInclude = {
  obra: { select: { id: true, titulo: true, coverPath: true, tipo: true } },
  volume: { select: { id: true, number: true, title: true, coverPath: true, alternateCovers: true } },
};

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService) {}

  list(readerId: string) {
    return this.prisma.readingSession.findMany({
      where: { readerId },
      include: sessionInclude,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
  }

  async create(readerId: string, dto: CreateReadingSessionDto) {
    await this.validateTargets(dto.obraId, dto.volumeId);
    this.validateProgress(dto.startProgress, dto.endProgress);
    const session = await this.prisma.readingSession.create({
      data: {
        ...dto,
        readerId,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        notes: dto.notes?.trim() || null,
      },
      include: sessionInclude,
    });
    if (dto.completed && dto.volumeId) {
      await this.prisma.volume.update({
        where: { id: dto.volumeId },
        data: { read: true, finishDate: session.occurredAt },
      });
    }
    return session;
  }

  async update(readerId: string, id: string, dto: UpdateReadingSessionDto) {
    await this.ownedSession(readerId, id);
    this.validateProgress(dto.startProgress, dto.endProgress);
    return this.prisma.readingSession.update({
      where: { id },
      data: {
        ...dto,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
      },
      include: sessionInclude,
    });
  }

  async remove(readerId: string, id: string) {
    await this.ownedSession(readerId, id);
    await this.prisma.readingSession.delete({ where: { id } });
    return { deleted: true };
  }

  async stats(readerId: string) {
    const sessions = await this.prisma.readingSession.findMany({
      where: { readerId },
      select: { occurredAt: true, minutes: true, startProgress: true, endProgress: true, unit: true, completed: true },
      orderBy: { occurredAt: 'asc' },
    });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const days = [...new Set(sessions.map((session) => this.dayKey(session.occurredAt)))].sort();
    const streaks = this.streaks(days);
    const progress = (unit: 'PAGE' | 'CHAPTER') => sessions
      .filter((session) => session.unit === unit)
      .reduce((sum, session) => sum + Math.max(0, (session.endProgress || 0) - (session.startProgress || 0)), 0);
    const activity = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (13 - index));
      const key = this.dayKey(date);
      const matching = sessions.filter((session) => this.dayKey(session.occurredAt) === key);
      return { date: key, minutes: matching.reduce((sum, session) => sum + session.minutes, 0), sessions: matching.length };
    });
    return {
      totalSessions: sessions.length,
      totalMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0),
      pagesRead: progress('PAGE'),
      chaptersRead: progress('CHAPTER'),
      completedSessions: sessions.filter((session) => session.completed).length,
      thisMonth: sessions.filter((session) => session.occurredAt >= monthStart).length,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      activity,
    };
  }

  private async validateTargets(obraId: string, volumeId?: string) {
    const obra = await this.prisma.obra.findUnique({ where: { id: obraId }, select: { id: true } });
    if (!obra) throw new NotFoundException('Obra no encontrada.');
    if (volumeId) {
      const volume = await this.prisma.volume.findFirst({ where: { id: volumeId, obraId }, select: { id: true } });
      if (!volume) throw new BadRequestException('El tomo no pertenece a la obra seleccionada.');
    }
  }

  private async ownedSession(readerId: string, id: string) {
    const session = await this.prisma.readingSession.findFirst({ where: { id, readerId } });
    if (!session) throw new NotFoundException('Sesión de lectura no encontrada.');
    return session;
  }

  private validateProgress(start?: number, end?: number) {
    if (start !== undefined && end !== undefined && end < start) {
      throw new BadRequestException('El progreso final no puede ser menor que el inicial.');
    }
  }

  private dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private streaks(days: string[]) {
    if (!days.length) return { current: 0, longest: 0 };
    let longest = 1;
    let run = 1;
    for (let index = 1; index < days.length; index += 1) {
      const previous = new Date(`${days[index - 1]}T00:00:00Z`);
      const current = new Date(`${days[index]}T00:00:00Z`);
      if ((current.getTime() - previous.getTime()) / 86400000 === 1) run += 1;
      else run = 1;
      longest = Math.max(longest, run);
    }
    const last = new Date(`${days[days.length - 1]}T00:00:00Z`);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const distance = Math.round((today.getTime() - last.getTime()) / 86400000);
    return { current: distance <= 1 ? run : 0, longest };
  }
}

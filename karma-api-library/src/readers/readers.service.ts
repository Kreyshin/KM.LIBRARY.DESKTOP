import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateReaderDto } from './dto/update-reader.dto';
import { parseStringArray, stringifyStringArray } from '../domain/constants';

@Injectable()
export class ReadersService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(readerId: string) {
    const reader = await this.safeReader(readerId);
    const works = await this.prisma.obra.findMany({
      select: {
        status: true,
        favorite: true,
        rating: true,
        genreLinks: { select: { genre: { select: { name: true } } } },
        volumes: { select: { read: true, finishDate: true } },
      },
    });
    const currentYear = new Date().getFullYear();
    const ratings = works.map((work) => work.rating).filter((rating): rating is number => rating !== null);
    const genreCounts = new Map<string, number>();
    works.forEach((work) => work.genreLinks.forEach(({ genre }) => genreCounts.set(genre.name, (genreCounts.get(genre.name) || 0) + 1)));

    return {
      reader,
      stats: {
        totalWorks: works.length,
        totalVolumes: works.reduce((sum, work) => sum + work.volumes.length, 0),
        readVolumes: works.reduce((sum, work) => sum + work.volumes.filter((volume) => volume.read).length, 0),
        completed: works.filter((work) => work.status === 'COMPLETED').length,
        reading: works.filter((work) => work.status === 'READING').length,
        favorites: works.filter((work) => work.favorite).length,
        completedThisYear: works.reduce(
          (sum, work) => sum + work.volumes.filter((volume) => volume.finishDate?.getFullYear() === currentYear).length,
          0,
        ),
        averageRating: ratings.length
          ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
          : 0,
        topGenres: [...genreCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count })),
      },
    };
  }

  async update(readerId: string, dto: UpdateReaderDto) {
    await this.prisma.profile.update({
      where: { id: readerId },
      data: {
        ...dto,
        displayName: dto.displayName?.trim(),
        bio: dto.bio?.trim() || null,
        location: dto.location?.trim() || null,
        avatarUrl: dto.avatarUrl?.trim() || null,
        favoriteGenresJson: stringifyStringArray(dto.favoriteGenres),
      },
    });
    return this.profile(readerId);
  }

  private async safeReader(readerId: string) {
    const reader = await this.prisma.profile.findUnique({
      where: { id: readerId },
      select: {
        id: true,
        displayName: true,
        bio: true,
        location: true,
        favoriteGenresJson: true,
        avatarUrl: true,
        readingGoal: true,
        createdAt: true,
        updatedAt: true,
        account: { select: { email: true, lastLoginAt: true } },
      },
    });
    if (!reader) throw new NotFoundException('Lector no encontrado.');
    const { favoriteGenresJson, account, ...profile } = reader;
    return { ...profile, email: account.email, lastLoginAt: account.lastLoginAt, favoriteGenres: parseStringArray(favoriteGenresJson) };
  }
}

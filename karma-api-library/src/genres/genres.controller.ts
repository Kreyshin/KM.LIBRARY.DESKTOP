import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CreateGenreDto, MergeGenreDto, UpdateGenreDto } from './dto/create-genre.dto';
import { GenresService } from './genres.service';

@Controller('genres')
@UseGuards(AuthGuard)
export class GenresController {
  constructor(private readonly genres: GenresService) {}

  @Get()
  list() { return this.genres.list(); }

  @Post()
  create(@Body() dto: CreateGenreDto) { return this.genres.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGenreDto) { return this.genres.update(id, dto); }

  @Post(':id/merge')
  merge(@Param('id') id: string, @Body() dto: MergeGenreDto) { return this.genres.merge(id, dto.targetId); }
}

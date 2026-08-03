import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentReader } from '../auth/current-reader.decorator';
import { CreateReadingSessionDto, UpdateReadingSessionDto } from './dto/reading-session.dto';
import { ReadingService } from './reading.service';

@Controller('reading-sessions')
@UseGuards(AuthGuard)
export class ReadingController {
  constructor(private readonly reading: ReadingService) {}
  @Get() list(@CurrentReader() reader: { id: string }) { return this.reading.list(reader.id); }
  @Get('stats') stats(@CurrentReader() reader: { id: string }) { return this.reading.stats(reader.id); }
  @Post() create(@CurrentReader() reader: { id: string }, @Body() dto: CreateReadingSessionDto) { return this.reading.create(reader.id, dto); }
  @Patch(':id') update(@CurrentReader() reader: { id: string }, @Param('id') id: string, @Body() dto: UpdateReadingSessionDto) { return this.reading.update(reader.id, id, dto); }
  @Delete(':id') remove(@CurrentReader() reader: { id: string }, @Param('id') id: string) { return this.reading.remove(reader.id, id); }
}

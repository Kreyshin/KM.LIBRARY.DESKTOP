import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentReader } from '../auth/current-reader.decorator';
import { UpdateReaderDto } from './dto/update-reader.dto';
import { ReadersService } from './readers.service';

@Controller('readers/me')
@UseGuards(AuthGuard)
export class ReadersController {
  constructor(private readonly readers: ReadersService) {}

  @Get()
  profile(@CurrentReader() reader: { id: string }) {
    return this.readers.profile(reader.id);
  }

  @Patch()
  update(@CurrentReader() reader: { id: string }, @Body() dto: UpdateReaderDto) {
    return this.readers.update(reader.id, dto);
  }
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { v4 as uuid } from 'uuid';
import { getUploadsDir } from '../data-paths';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentReader } from '../auth/current-reader.decorator';
import { DigitalFilesService } from './digital-files.service';
import { UpdateDigitalProgressDto } from './dto/update-digital-progress.dto';
import { ReorderPagesDto } from './dto/reorder-pages.dto';

function digitalUploadStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const dir = join(getUploadsDir(), '.tmp-digital-uploads');
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
  });
}

@Controller('obras/:obraId/volumes/:number/digital-files')
@UseGuards(AuthGuard)
export class DigitalFilesController {
  constructor(private readonly digitalFiles: DigitalFilesService) {}

  @Get()
  list(@Param('obraId') obraId: string, @Param('number', ParseIntPipe) number: number) {
    return this.digitalFiles.list(obraId, number);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', 500, { storage: digitalUploadStorage(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } }))
  upload(
    @Param('obraId') obraId: string,
    @Param('number', ParseIntPipe) number: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('label') label?: string,
  ) {
    return this.digitalFiles.upload(obraId, number, files, label);
  }

  @Delete(':fileId')
  remove(@Param('obraId') obraId: string, @Param('number', ParseIntPipe) number: number, @Param('fileId') fileId: string) {
    return this.digitalFiles.remove(obraId, number, fileId);
  }

  @Post(':fileId/pages')
  @UseInterceptors(FilesInterceptor('files', 500, { storage: digitalUploadStorage(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } }))
  appendPages(
    @Param('obraId') obraId: string,
    @Param('number', ParseIntPipe) number: number,
    @Param('fileId') fileId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.digitalFiles.appendPages(obraId, number, fileId, files);
  }

  @Put(':fileId/pages/order')
  reorderPages(
    @Param('obraId') obraId: string,
    @Param('number', ParseIntPipe) number: number,
    @Param('fileId') fileId: string,
    @Body() dto: ReorderPagesDto,
  ) {
    return this.digitalFiles.reorderPages(obraId, number, fileId, dto.order);
  }

  @Get(':fileId/progress')
  getProgress(
    @Param('obraId') obraId: string,
    @Param('number', ParseIntPipe) number: number,
    @Param('fileId') fileId: string,
    @CurrentReader() reader: { id: string },
  ) {
    return this.digitalFiles.getProgress(obraId, number, fileId, reader.id);
  }

  @Put(':fileId/progress')
  saveProgress(
    @Param('obraId') obraId: string,
    @Param('number', ParseIntPipe) number: number,
    @Param('fileId') fileId: string,
    @CurrentReader() reader: { id: string },
    @Body() dto: UpdateDigitalProgressDto,
  ) {
    return this.digitalFiles.saveProgress(obraId, number, fileId, reader.id, dto);
  }
}

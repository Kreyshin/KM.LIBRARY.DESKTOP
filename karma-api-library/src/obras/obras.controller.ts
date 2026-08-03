import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';
import { getUploadsDir } from '../data-paths';
import { AuthGuard } from '../auth/auth.guard';
import { ObrasService } from './obras.service';
import { CreateObraDto } from './dto/create-obra.dto';
import { UpdateObraDto } from './dto/update-obra.dto';
import { UpdateVolumeDto } from './dto/update-volume.dto';
import { ResizeVolumesDto } from './dto/resize-volumes.dto';
import { ImageProcessingService } from './image-processing.service';
import {
  CreateVolumeCoverVariantDto,
  SetPrimaryVolumeCoverDto,
  UpdateVolumeCoverVariantDto,
} from './dto/volume-cover-variant.dto';

function coverStorage() {
  return diskStorage({
    destination: (req, _file, cb) => {
      const obraId = req.params.id;
      const dir = join(getUploadsDir(), obraId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${uuid()}${extname(file.originalname) || '.jpg'}`);
    },
  });
}

@Controller('obras')
@UseGuards(AuthGuard)
export class ObrasController {
  constructor(private readonly obrasService: ObrasService, private readonly images: ImageProcessingService) {}

  @Get()
  findAll() {
    return this.obrasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.obrasService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateObraDto) {
    return this.obrasService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateObraDto) {
    return this.obrasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.obrasService.remove(id);
  }

  @Patch(':id/total-volumes')
  resizeVolumes(@Param('id') id: string, @Body() dto: ResizeVolumesDto) {
    return this.obrasService.resizeVolumes(id, dto.total);
  }

  @Post(':id/volumes')
  addVolume(@Param('id') id: string) {
    return this.obrasService.addVolume(id);
  }

  @Delete(':id/volumes/:number')
  removeVolume(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
  ) {
    return this.obrasService.removeVolume(id, number);
  }

  @Patch(':id/volumes/:number')
  updateVolume(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @Body() dto: UpdateVolumeDto,
  ) {
    return this.obrasService.updateVolume(id, number, dto);
  }

  @Post(':id/cover')
  @UseInterceptors(FileInterceptor('file', { storage: coverStorage() }))
  async uploadObraCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const optimized = await this.images.optimize(id, file.filename);
    return this.obrasService.saveObraCover(id, optimized.filename, optimized.thumbnailFilename);
  }

  @Post(':id/volumes/:number/cover')
  @UseInterceptors(FileInterceptor('file', { storage: coverStorage() }))
  async uploadVolumeCover(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const optimized = await this.images.optimize(id, file.filename);
    return this.obrasService.saveVolumeCover(id, number, optimized.filename, optimized.thumbnailFilename);
  }

  @Post(':id/volumes/:number/spine')
  @UseInterceptors(FileInterceptor('file', { storage: coverStorage() }))
  async uploadVolumeSpine(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const optimized = await this.images.optimize(id, file.filename, 'spine');
    return this.obrasService.saveVolumeSpine(id, number, optimized.filename);
  }

  @Post(':id/volumes/:number/alternate-covers')
  @UseInterceptors(FileInterceptor('file', { storage: coverStorage() }))
  async uploadVolumeAlternateCover(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateVolumeCoverVariantDto,
  ) {
    if (!file) throw new BadRequestException('Selecciona una imagen para esta edición.');
    const optimized = await this.images.optimize(id, file.filename);
    return this.obrasService.saveVolumeAlternateCover(
      id,
      number,
      optimized.filename,
      optimized.thumbnailFilename,
      dto,
    );
  }

  @Post(':id/volumes/:number/alternate-covers/:coverId/image')
  @UseInterceptors(FileInterceptor('file', { storage: coverStorage() }))
  async replaceVolumeAlternateCover(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @Param('coverId') coverId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Selecciona la nueva imagen de portada.');
    const optimized = await this.images.optimize(id, file.filename);
    return this.obrasService.replaceVolumeAlternateCover(id, number, coverId, optimized.filename, optimized.thumbnailFilename);
  }

  @Post(':id/volumes/:number/alternate-covers/:coverId/spine')
  @UseInterceptors(FileInterceptor('file', { storage: coverStorage() }))
  async uploadVolumeAlternateSpine(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @Param('coverId') coverId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Selecciona una imagen de lomo.');
    const optimized = await this.images.optimize(id, file.filename, 'spine');
    return this.obrasService.saveVolumeAlternateSpine(id, number, coverId, optimized.filename);
  }

  @Patch(':id/volumes/:number/alternate-covers/:coverId')
  updateVolumeAlternateCover(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @Param('coverId') coverId: string,
    @Body() dto: UpdateVolumeCoverVariantDto,
  ) {
    return this.obrasService.updateVolumeAlternateCover(
      id,
      number,
      coverId,
      dto,
    );
  }

  @Delete(':id/volumes/:number/alternate-covers/:coverId')
  removeVolumeAlternateCover(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @Param('coverId') coverId: string,
  ) {
    return this.obrasService.removeVolumeAlternateCover(
      id,
      number,
      coverId,
    );
  }

  @Patch(':id/volumes/:number/primary-cover')
  setPrimaryVolumeCover(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @Body() dto: SetPrimaryVolumeCoverDto,
  ) {
    return this.obrasService.setPrimaryVolumeCover(
      id,
      number,
      dto.coverId ?? null,
    );
  }
}

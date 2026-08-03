import { Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemService) {}
  @Get('status') status() { return this.system.status(); }
  @Post('backups') @UseGuards(AuthGuard) createBackup() { return this.system.createBackup(); }
  @Get('backups/:name') @UseGuards(AuthGuard) download(@Param('name') name: string, @Res() response: Response) { return response.download(this.system.backupPath(name)); }
  @Post('restore')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 * 1024 } }))
  restore(@UploadedFile() file: Express.Multer.File) { return this.system.restoreBackup(file); }
}

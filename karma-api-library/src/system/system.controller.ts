import { Body, Controller, Delete, Get, Param, Post, Put, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SystemService } from './system.service';
import { UpdateBackupSettingsDto } from './dto/update-backup-settings.dto';

@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemService) {}
  @Get('status') status() { return this.system.status(); }

  @Get('backups')
  @UseGuards(AuthGuard)
  list() { return { items: this.system.listBackups(), settings: this.system.getBackupSettings() }; }

  @Put('backups/settings')
  @UseGuards(AuthGuard)
  updateSettings(@Body() dto: UpdateBackupSettingsDto) { return this.system.updateBackupSettings(dto); }

  @Post('backups')
  @UseGuards(AuthGuard)
  createBackup() { return this.system.createBackup(); }

  @Get('backups/:name')
  @UseGuards(AuthGuard)
  download(@Param('name') name: string, @Res() response: Response) { return response.download(this.system.backupPath(name)); }

  @Get('backups/:name/verify')
  @UseGuards(AuthGuard)
  verify(@Param('name') name: string) { return this.system.verifyBackup(name); }

  @Post('backups/:name/restore')
  @UseGuards(AuthGuard)
  restoreByName(@Param('name') name: string) { return this.system.restoreBackupByName(name); }

  @Delete('backups/:name')
  @UseGuards(AuthGuard)
  remove(@Param('name') name: string) { return this.system.deleteBackup(name); }

  @Post('restore')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 * 1024 } }))
  restore(@UploadedFile() file: Express.Multer.File) { return this.system.restoreBackup(file); }
}

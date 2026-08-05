import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DigitalFilesController } from './digital-files.controller';
import { DigitalFilesService } from './digital-files.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DigitalFilesController],
  providers: [DigitalFilesService],
})
export class DigitalFilesModule {}

import { Module } from '@nestjs/common';
import { ObrasController } from './obras.controller';
import { ObrasService } from './obras.service';
import { ImageProcessingService } from './image-processing.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ObrasController],
  providers: [ObrasService, ImageProcessingService],
})
export class ObrasModule {}

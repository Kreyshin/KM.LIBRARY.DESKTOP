import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReadersController } from './readers.controller';
import { ReadersService } from './readers.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReadersController],
  providers: [ReadersService],
})
export class ReadersModule {}

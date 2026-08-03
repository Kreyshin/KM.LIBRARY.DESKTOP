import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShelvesController } from './shelves.controller';
import { ShelvesService } from './shelves.service';

@Module({ imports: [PrismaModule, AuthModule], controllers: [ShelvesController], providers: [ShelvesService] })
export class ShelvesModule {}

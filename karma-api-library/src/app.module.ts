import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ObrasModule } from './obras/obras.module';
import { AuthModule } from './auth/auth.module';
import { ReadersModule } from './readers/readers.module';
import { ReadingModule } from './reading/reading.module';
import { ShelvesModule } from './shelves/shelves.module';
import { GenresModule } from './genres/genres.module';
import { SystemModule } from './system/system.module';
import { ServeStaticModule } from '@nestjs/serve-static';

@Module({
  imports: [
    ...(process.env.KARMA_STATIC_DIR ? [ServeStaticModule.forRoot({ rootPath: process.env.KARMA_STATIC_DIR, exclude: ['/api/{*rest}', '/uploads/{*rest}'] })] : []),
    PrismaModule, ObrasModule, AuthModule, ReadersModule, ReadingModule, ShelvesModule, GenresModule, SystemModule,
  ],
})
export class AppModule {}

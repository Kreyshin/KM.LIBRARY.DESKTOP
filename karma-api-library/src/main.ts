import 'dotenv/config';
import './configure-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getUploadsDir } from './data-paths';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()) || true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Portadas servidas como archivos estáticos: /uploads/<mangaId>/<archivo>
  app.useStaticAssets(getUploadsDir(), { prefix: '/uploads' });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const host = process.env.HOST || '127.0.0.1';
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`Karma Library API escuchando en http://${host}:${port}`);
}
bootstrap();

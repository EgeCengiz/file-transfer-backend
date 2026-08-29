import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'http';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') ?? '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port);

  // Buyuk dosya yuklemelerinde baglanti erken kesilmesin
  const server = app.getHttpServer() as Server;
  server.setTimeout(0);
  server.keepAliveTimeout = 0;
  server.headersTimeout = 0;

  console.log(`File Transfer API http://localhost:${port} adresinde calisiyor`);
}

void bootstrap();

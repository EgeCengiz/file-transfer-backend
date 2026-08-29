import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'http';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  const configService = app.get(ConfigService);

  const defaultOrigins = [
    'https://file.optimalajans.com',
    'http://file.optimalajans.com',
    'http://localhost:5173',
  ];

  const expandOrigins = (values: string[]): string[] => {
    const origins = new Set<string>();
    for (const value of values) {
      const item = value.trim();
      if (!item) continue;
      if (item.startsWith('http://') || item.startsWith('https://')) {
        origins.add(item);
        continue;
      }
      origins.add(`https://${item}`);
      origins.add(`http://${item}`);
    }
    return [...origins];
  };

  const configuredOrigins = expandOrigins(
    (configService.get<string>('CORS_ORIGIN') ?? '').split(','),
  );
  const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposedHeaders: [
      'Content-Range',
      'Accept-Ranges',
      'Content-Length',
      'Content-Disposition',
    ],
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

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'http';
import { AppModule } from './app.module';
import { mountFrontend } from './common/utils/frontend-static';

type PassengerGlobal = {
  configure: (options: { autoInstall: boolean }) => void;
};

function getPassenger(): PassengerGlobal | undefined {
  return (globalThis as { PhusionPassenger?: PassengerGlobal }).PhusionPassenger;
}

async function bootstrap() {
  const passenger = getPassenger();
  if (passenger) {
    passenger.configure({ autoInstall: false });
  }

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

  // Nest route'larindan once: asset + SPA fallback (refresh /login index.html)
  const frontendDir = mountFrontend(app);

  const port = configService.get<number>('PORT') ?? 3000;
  const listenTarget = passenger ? 'passenger' : port;
  await app.listen(listenTarget);

  const server = app.getHttpServer() as Server;
  server.setTimeout(0);
  server.keepAliveTimeout = 0;
  server.headersTimeout = 0;

  const where = passenger ? 'Passenger' : `http://localhost:${port}`;
  const spa = frontendDir ? ` | SPA ${frontendDir}` : '';
  console.log(`File Transfer API ${where} adresinde calisiyor${spa}`);
}

void bootstrap();

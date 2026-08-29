import { existsSync } from 'fs';
import { join, resolve } from 'path';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';

const API_PREFIXES = ['/auth', '/folders', '/files', '/activity', '/health'];

export function resolveFrontendDir(): string | null {
  const configured = process.env.FRONTEND_DIST?.trim();
  const candidates = [
    configured ? resolve(configured) : null,
    resolve(process.cwd(), 'public'),
    resolve(process.cwd(), '..', 'file-transfer-frontend', 'dist'),
  ].filter((dir): dir is string => Boolean(dir));

  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) {
      return dir;
    }
  }
  return null;
}

function isApiPath(pathname: string): boolean {
  return API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Ayni process'te Vite dist: refresh'te Plesk "It works!" yerine SPA. */
export function mountFrontend(app: INestApplication): string | null {
  const frontendDir = resolveFrontendDir();
  if (!frontendDir) {
    return null;
  }

  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  expressApp.use(express.static(frontendDir, { index: false }));

  const indexPath = join(frontendDir, 'index.html');
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    if (isApiPath(req.path)) {
      next();
      return;
    }
    res.sendFile(indexPath);
  });

  return frontendDir;
}

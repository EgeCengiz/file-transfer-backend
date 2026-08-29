import * as fs from 'fs';
import * as path from 'path';

export function resolveUploadDir(): string {
  const configured = process.env.UPLOAD_DIR ?? './storage';
  const resolved = path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
  return resolved;
}

export function resolveStoredFilePath(storedName: string): string {
  return path.join(resolveUploadDir(), storedName);
}

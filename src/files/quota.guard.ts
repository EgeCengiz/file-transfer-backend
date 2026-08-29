import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';

const DEFAULT_QUOTA_BYTES = 100 * 1024 * 1024 * 1024;

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const contentLength = Number(request.headers['content-length'] ?? 0);
    const quotaBytes =
      Number(this.configService.get<string>('QUOTA_BYTES')) ||
      DEFAULT_QUOTA_BYTES;

    const { used } = await this.filesService.getUsage();

    if (used + contentLength > quotaBytes) {
      throw new ForbiddenException(
        'Depolama kotasi asildi, yukleme yapilamiyor',
      );
    }

    return true;
  }
}

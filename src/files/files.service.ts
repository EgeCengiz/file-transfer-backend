import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { FileEntity } from '../entities/file.entity';
import { LogsService } from '../logs/logs.service';
import { LogAction } from '../common/enums/log-action.enum';
import { resolveStoredFilePath } from '../common/utils/storage-path.util';

const DEFAULT_QUOTA_BYTES = 100 * 1024 * 1024 * 1024;

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepository: Repository<FileEntity>,
    private readonly logsService: LogsService,
    private readonly configService: ConfigService,
  ) {}

  async listByFolder(folderId: number | null): Promise<FileEntity[]> {
    return this.filesRepository.find({
      where: { folderId: folderId === null ? IsNull() : folderId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUsage(): Promise<{ used: number; total: number }> {
    const raw = await this.filesRepository
      .createQueryBuilder('file')
      .select('SUM(file.size)', 'sum')
      .getRawOne<{ sum: string | null }>();
    const sum = raw?.sum ?? null;

    const total =
      Number(this.configService.get<string>('QUOTA_BYTES')) ||
      DEFAULT_QUOTA_BYTES;

    return { used: Number(sum) || 0, total };
  }

  async getById(id: number): Promise<FileEntity> {
    const file = await this.filesRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('Dosya bulunamadi');
    }
    return file;
  }

  getDiskPath(file: FileEntity): string {
    return resolveStoredFilePath(file.storedName);
  }

  async create(
    folderId: number | null,
    multerFile: Express.Multer.File,
  ): Promise<FileEntity> {
    const file = this.filesRepository.create({
      originalName: multerFile.originalname,
      storedName: multerFile.filename,
      size: multerFile.size,
      mimeType: multerFile.mimetype,
      folderId,
    });
    const saved = await this.filesRepository.save(file);

    await this.logsService.record({
      action: LogAction.UPLOAD_FILE,
      targetName: multerFile.originalname,
      detail: `${(multerFile.size / (1024 * 1024)).toFixed(2)} MB`,
    });

    return saved;
  }

  async remove(id: number): Promise<void> {
    const file = await this.getById(id);
    const diskPath = this.getDiskPath(file);

    try {
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    } catch {
      // DB kaydi yine de silinsin
    }

    await this.filesRepository.remove(file);

    await this.logsService.record({
      action: LogAction.DELETE_FILE,
      targetName: file.originalName,
    });
  }
}

import {
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import { FilesService } from './files.service';
import { multerOptions } from './multer.config';
import { QuotaGuard } from './quota.guard';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  listByFolder(@Query('folderId') folderId?: string) {
    const parsedFolderId = folderId ? parseInt(folderId, 10) : null;
    return this.filesService.listByFolder(parsedFolderId);
  }

  @Get('storage/usage')
  getUsage() {
    return this.filesService.getUsage();
  }

  @Post('upload')
  @UseGuards(QuotaGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folderId') folderId: string | undefined,
  ) {
    const parsedFolderId = folderId ? parseInt(folderId, 10) : null;
    return this.filesService.create(parsedFolderId, file);
  }

  @Get(':id/download')
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const file = await this.filesService.getById(id);
    const diskPath = this.filesService.getDiskPath(file);

    if (!fs.existsSync(diskPath)) {
      res.status(404).json({ message: 'Dosya diskte bulunamadi' });
      return;
    }

    const encodedName = encodeURIComponent(file.originalName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
    );
    res.setHeader('Content-Type', file.mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Length', file.size);
    fs.createReadStream(diskPath).pipe(res);
  }

  @Get(':id/stream')
  async stream(
    @Param('id', ParseIntPipe) id: number,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.filesService.getById(id);
    const diskPath = this.filesService.getDiskPath(file);

    if (!fs.existsSync(diskPath)) {
      res.status(404).json({ message: 'Dosya diskte bulunamadi' });
      return;
    }

    const stat = fs.statSync(diskPath);
    const fileSize = stat.size;
    const contentType = file.mimeType ?? 'application/octet-stream';

    if (!range) {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });
      fs.createReadStream(diskPath).pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });
    fs.createReadStream(diskPath, { start, end }).pipe(res);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.filesService.remove(id);
    return { success: true };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get()
  async findChildren(@Query('parentId') parentId?: string) {
    const parsedParentId = parentId ? parseInt(parentId, 10) : null;
    const [folders, breadcrumb] = await Promise.all([
      this.foldersService.findChildrenWithStats(parsedParentId),
      this.foldersService.getBreadcrumb(parsedParentId),
    ]);
    return { folders, breadcrumb };
  }

  @Get(':id/breadcrumb')
  getBreadcrumb(@Param('id', ParseIntPipe) id: number) {
    return this.foldersService.getBreadcrumb(id);
  }

  @Post()
  create(@Body() dto: CreateFolderDto) {
    return this.foldersService.create(dto.name, dto.parentId ?? null);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.foldersService.remove(id);
    return { success: true };
  }
}

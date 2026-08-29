import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Folder } from '../entities/folder.entity';
import { FileEntity } from '../entities/file.entity';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [TypeOrmModule.forFeature([Folder, FileEntity]), ActivityModule],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}

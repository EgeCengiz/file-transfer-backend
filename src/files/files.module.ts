import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from '../entities/file.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { QuotaGuard } from './quota.guard';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity]), ActivityModule],
  controllers: [FilesController],
  providers: [FilesService, QuotaGuard],
  exports: [FilesService],
})
export class FilesModule {}

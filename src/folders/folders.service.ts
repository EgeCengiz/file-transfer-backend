import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import * as fs from 'fs';
import { Folder } from '../entities/folder.entity';
import { FileEntity } from '../entities/file.entity';
import { ActivityService } from '../activity/activity.service';
import { LogAction } from '../common/enums/log-action.enum';
import { resolveStoredFilePath } from '../common/utils/storage-path.util';
import { classifyMimeType } from '../common/utils/file-category.util';

export interface FolderStats {
  fileCount: number;
  totalSize: number;
  byType: { image: number; video: number; document: number; other: number };
}

export interface FolderWithStats extends Folder {
  stats: FolderStats;
}

function emptyStats(): FolderStats {
  return {
    fileCount: 0,
    totalSize: 0,
    byType: { image: 0, video: 0, document: 0, other: 0 },
  };
}

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private readonly foldersRepository: Repository<Folder>,
    @InjectRepository(FileEntity)
    private readonly filesRepository: Repository<FileEntity>,
    private readonly activityService: ActivityService,
  ) {}

  async findChildren(parentId: number | null): Promise<Folder[]> {
    return this.foldersRepository.find({
      where: { parentId: parentId === null ? IsNull() : parentId },
      order: { name: 'ASC' },
    });
  }

  async findChildrenWithStats(
    parentId: number | null,
  ): Promise<FolderWithStats[]> {
    const folders = await this.findChildren(parentId);
    const statsMap = await this.getStatsForFolders(folders.map((f) => f.id));
    return folders.map((folder) => ({
      ...folder,
      stats: statsMap.get(folder.id) ?? emptyStats(),
    }));
  }

  async getStatsForFolders(
    folderIds: number[],
  ): Promise<Map<number, FolderStats>> {
    const statsMap = new Map<number, FolderStats>();
    if (folderIds.length === 0) {
      return statsMap;
    }

    const allFolders = await this.foldersRepository.find({
      select: { id: true, parentId: true },
    });
    const childrenMap = new Map<number, number[]>();
    for (const folder of allFolders) {
      if (folder.parentId !== null) {
        const siblings = childrenMap.get(folder.parentId) ?? [];
        siblings.push(folder.id);
        childrenMap.set(folder.parentId, siblings);
      }
    }

    const descendantsByRoot = new Map<number, Set<number>>();
    for (const rootId of folderIds) {
      const set = new Set<number>([rootId]);
      let queue = [rootId];
      while (queue.length > 0) {
        const next: number[] = [];
        for (const currentId of queue) {
          for (const childId of childrenMap.get(currentId) ?? []) {
            if (!set.has(childId)) {
              set.add(childId);
              next.push(childId);
            }
          }
        }
        queue = next;
      }
      descendantsByRoot.set(rootId, set);
    }

    const allRelevantIds = new Set<number>();
    for (const set of descendantsByRoot.values()) {
      for (const id of set) {
        allRelevantIds.add(id);
      }
    }

    const files = await this.filesRepository.find({
      where: { folderId: In([...allRelevantIds]) },
      select: { size: true, mimeType: true, folderId: true },
    });

    for (const rootId of folderIds) {
      const descendantSet = descendantsByRoot.get(rootId) ?? new Set<number>();
      const stats = emptyStats();
      for (const file of files) {
        if (file.folderId !== null && descendantSet.has(file.folderId)) {
          stats.fileCount += 1;
          stats.totalSize += Number(file.size);
          stats.byType[classifyMimeType(file.mimeType)] += 1;
        }
      }
      statsMap.set(rootId, stats);
    }

    return statsMap;
  }

  async findById(id: number): Promise<Folder> {
    const folder = await this.foldersRepository.findOne({ where: { id } });
    if (!folder) {
      throw new NotFoundException('Klasor bulunamadi');
    }
    return folder;
  }

  async getBreadcrumb(id: number | null): Promise<Folder[]> {
    const chain: Folder[] = [];
    let currentId = id;
    while (currentId !== null && currentId !== undefined) {
      const folder = await this.foldersRepository.findOne({
        where: { id: currentId },
      });
      if (!folder) break;
      chain.unshift(folder);
      currentId = folder.parentId;
    }
    return chain;
  }

  async create(name: string, parentId: number | null): Promise<Folder> {
    if (parentId) {
      await this.findById(parentId);
    }

    const folder = this.foldersRepository.create({
      name,
      parentId: parentId ?? null,
    });
    const saved = await this.foldersRepository.save(folder);

    await this.activityService.record({
      action: LogAction.CREATE_FOLDER,
      targetName: name,
    });

    return saved;
  }

  private async collectDescendantIds(rootId: number): Promise<number[]> {
    const ids: number[] = [];
    let queue: number[] = [rootId];
    while (queue.length > 0) {
      const children = await this.foldersRepository.find({
        where: { parentId: In(queue) },
      });
      const childIds = children.map((c) => c.id);
      ids.push(...childIds);
      queue = childIds;
    }
    return ids;
  }

  async remove(id: number): Promise<void> {
    const folder = await this.findById(id);
    const descendantIds = await this.collectDescendantIds(id);
    const allFolderIds = [id, ...descendantIds];

    const files = await this.filesRepository
      .createQueryBuilder('file')
      .where('file.folderId IN (:...ids)', { ids: allFolderIds })
      .getMany();

    for (const file of files) {
      const filePath = resolveStoredFilePath(file.storedName);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // devam et, DB kaydi yine silinsin
      }
    }

    if (files.length > 0) {
      await this.filesRepository.remove(files);
    }

    // Once en derin alt klasorleri, sonunda kok klasoru sil (FK sirasi icin)
    const orderedIds = [...descendantIds].reverse();
    orderedIds.push(id);
    for (const folderId of orderedIds) {
      await this.foldersRepository.delete({ id: folderId });
    }

    await this.activityService.record({
      action: LogAction.DELETE_FOLDER,
      targetName: folder.name,
      detail: `${files.length} dosya ve ${descendantIds.length} alt klasor birlikte silindi`,
    });
  }
}

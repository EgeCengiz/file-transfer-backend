import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities/activity-log.entity';
import { LogAction } from '../common/enums/log-action.enum';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepository: Repository<ActivityLog>,
  ) {}

  async record(params: {
    action: LogAction;
    targetName?: string | null;
    detail?: string | null;
  }): Promise<void> {
    const log = this.activityRepository.create({
      action: params.action,
      targetName: params.targetName ?? null,
      detail: params.detail ?? null,
    });
    await this.activityRepository.save(log);
  }

  async findAll(params: {
    page: number;
    limit: number;
    action?: LogAction;
  }): Promise<{ items: ActivityLog[]; total: number }> {
    const { page, limit, action } = params;
    const query = this.activityRepository
      .createQueryBuilder('activity')
      .orderBy('activity.createdAt', 'DESC');

    if (action) {
      query.andWhere('activity.action = :action', { action });
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }
}

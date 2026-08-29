import { Controller, Get, Query } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { LogAction } from '../common/enums/log-action.enum';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  getActivity(
    @Query('page') page = '1',
    @Query('limit') limit = '25',
    @Query('action') action?: LogAction,
  ) {
    return this.activityService.findAll({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 25,
      action,
    });
  }
}

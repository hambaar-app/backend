import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiOperation } from '@nestjs/swagger';
import { ApiQueryPagination, AuthResponses } from '../../common/api-docs.decorators';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { CurrentUser } from '../user/current-user.middleware';

@Controller('notification')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @ApiOperation({
    summary: 'Get user\'s notifications'
  })
  @AuthResponses()
  @ApiQueryPagination()
  @UseGuards(AccessTokenGuard)
  @Get()
  async getAllNotifications(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser('id') userId: string
  ) {
    return this.notificationService.getAll(userId, page, limit);
  }
}

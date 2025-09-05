import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiOperation } from '@nestjs/swagger';
import { AuthResponses } from 'src/common/api-docs.decorators';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { CurrentUser } from '../user/current-user.middleware';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @ApiOperation({
    summary: 'Get user\'s main dashboard'
  })
  @AuthResponses()
  @UseGuards(AccessTokenGuard)
  @Get()
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.dashboardService.getDashboard(userId);
  }
}

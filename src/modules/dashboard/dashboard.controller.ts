import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AuthResponses } from '../../common/api-docs.decorators';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { CurrentUser } from '../user/current-user.middleware';
import { Serialize } from '../../common/serialize.interceptor';
import { DashboardResponseDto } from './dashboard.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @ApiOperation({
    summary: 'Get user\'s main dashboard'
  })
  @ApiOkResponse({
    type: DashboardResponseDto
  })
  @AuthResponses()
  @UseGuards(AccessTokenGuard)
  @Serialize(DashboardResponseDto)
  @Get()
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.dashboardService.getDashboard(userId);
  }
}

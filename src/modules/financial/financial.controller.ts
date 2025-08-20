import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { AddFundsDto } from './dto/add-funds.dto';
import { CurrentUser } from '../user/current-user.middleware';
import { ApiOperation } from '@nestjs/swagger';
import { AuthResponses } from 'src/common/api-docs.decorators';
import { AccessTokenGuard } from '../auth/guard/token.guard';

@Controller('financial')
export class FinancialController {
  constructor(private financialService: FinancialService) {}

  @ApiOperation({
    summary: 'Add funds to a user wallet'
  })
  @AuthResponses()
  @UseGuards(AccessTokenGuard)
  @Post('add-funds')
  async addFunds(
    @Body() body: AddFundsDto,
    @CurrentUser('id') userId: string
  ) {
    return this.financialService.addFunds(userId, body.amount);
  }
}

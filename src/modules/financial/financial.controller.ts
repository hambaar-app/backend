import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FinancialService } from './financial.service';
import { AddFundsDto } from './dto/add-funds.dto';
import { CurrentUser } from '../user/current-user.middleware';
import { ApiOperation } from '@nestjs/swagger';
import {
  ApiQueryPagination,
  AuthResponses,
} from 'src/common/api-docs.decorators';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { CreateEscrowDto } from './dto/create-escrow.dto';

@Controller('financial')
export class FinancialController {
  constructor(private financialService: FinancialService) {}

  @ApiOperation({
    summary: 'Get wallet with its transactions',
  })
  @AuthResponses()
  @ApiQueryPagination()
  @UseGuards(AccessTokenGuard)
  @Get('wallet')
  async getWallet(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.financialService.getWallet(userId, page, limit);
  }

  @ApiOperation({
    summary: 'Add funds to a user wallet',
  })
  @AuthResponses()
  @UseGuards(AccessTokenGuard)
  @Post('add-funds')
  async addFunds(
    @Query() query: AddFundsDto,
    @CurrentUser('id') userId: string
  ) {
    return this.financialService.addFunds(userId, query);
  }

  @ApiOperation({
    summary: 'Add funds and Create escrow',
    description: 'Add funds and Create escrow for a specific package shipping price.'
  })
  @AuthResponses()
  @UseGuards(AccessTokenGuard)
  @Post('add-funds')
  async addFundsAndCreateEscrow(
    @Query() query: AddFundsDto & CreateEscrowDto,
    @CurrentUser('id') userId: string
  ) {
    return this.financialService.addFundsAndCreateEscrow(userId, query);
  }
}

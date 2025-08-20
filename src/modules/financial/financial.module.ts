import { Module } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { FinancialController } from './financial.controller';

@Module({
  providers: [FinancialService],
  controllers: [FinancialController]
})
export class FinancialModule {}

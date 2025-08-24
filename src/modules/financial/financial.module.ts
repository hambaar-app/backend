import { Module } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { FinancialController } from './financial.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [
    PrismaModule,
    TokenModule
  ],
  providers: [FinancialService],
  controllers: [FinancialController],
  exports: [FinancialService]
})
export class FinancialModule {}

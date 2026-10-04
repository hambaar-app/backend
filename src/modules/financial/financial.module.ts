import { Module } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { WalletService } from './domain/wallet.service';
import { EscrowService } from './domain/escrow.service';
import { FinancialController } from './financial.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [PrismaModule, TokenModule],
  providers: [FinancialService, WalletService, EscrowService],
  controllers: [FinancialController],
  exports: [FinancialService, WalletService, EscrowService],
})
export class FinancialModule {}

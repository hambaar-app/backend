import { Injectable } from '@nestjs/common';
import { AddFundsAndCreateEscrow, AddFundsDto } from './dto/add-funds.dto';
import { CreateEscrowDto } from './dto/create-escrow.dto';
import { PrismaTransaction } from '../prisma/prisma.types';
import { WalletService } from './domain/wallet.service';
import { EscrowService } from './domain/escrow.service';

// TODO: Payment Gateway transaction

/**
 * Financial facade (Phase 5 Task 3).
 *
 * Preserves the public API consumed by `FinancialController`,
 * `TripService` and `TripRequestService`; all logic lives in
 * `WalletService` (reads + deposits) and `EscrowService` (escrow lifecycle).
 */
@Injectable()
export class FinancialService {
  constructor(
    private wallets: WalletService,
    private escrows: EscrowService,
  ) {}

  async getWallet(
    userId: string,
    page = 1,
    limit = 10,
    tx?: PrismaTransaction,
  ) {
    return tx
      ? this.wallets.getWallet(userId, page, limit, tx)
      : this.wallets.getWallet(userId, page, limit);
  }

  async addFunds(userId: string, dto: AddFundsDto) {
    return this.wallets.addFunds(userId, dto);
  }

  async createEscrow(dto: CreateEscrowDto) {
    return this.escrows.createEscrow(dto);
  }

  async addFundsAndCreateEscrow(userId: string, dto: AddFundsAndCreateEscrow) {
    return this.escrows.addFundsAndCreateEscrow(userId, dto);
  }

  async releaseEscrow(
    packageId: string,
    tripId: string,
    tx: PrismaTransaction,
  ) {
    return this.escrows.releaseEscrow(packageId, tripId, tx);
  }
}

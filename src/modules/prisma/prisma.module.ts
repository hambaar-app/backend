import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TransactionRunner } from './transaction-runner';

@Module({
  providers: [PrismaService, TransactionRunner],
  exports: [PrismaService, TransactionRunner],
})
export class PrismaModule {}

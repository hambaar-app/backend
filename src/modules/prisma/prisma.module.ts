import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TransactionRunner } from './transaction-runner';
import { CityRepository } from './repositories/city.repository';

@Module({
  providers: [PrismaService, TransactionRunner, CityRepository],
  exports: [PrismaService, TransactionRunner, CityRepository],
})
export class PrismaModule {}

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    PrismaModule,
    S3Module,
  ],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {}

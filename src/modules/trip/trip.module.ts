import { Module } from '@nestjs/common';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { MapModule } from '../map/map.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { FinancialModule } from '../financial/financial.module';
import { S3Module } from '../s3/s3.module';
import { TurfModule } from '../turf/turf.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    MapModule,
    TokenModule,
    UserModule,
    FinancialModule,
    S3Module,
    TurfModule,
    NotificationModule,
  ],
  controllers: [TripController],
  providers: [TripService],
  exports: [TripService]
})
export class TripModule {}

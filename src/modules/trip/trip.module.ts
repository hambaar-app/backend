import { MiddlewareConsumer, Module } from '@nestjs/common';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { MapModule } from '../map/map.module';
import { CurrentUserMiddleware } from 'src/modules/user/current-user.middleware';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { FinancialModule } from '../financial/financial.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    PrismaModule,
    MapModule,
    TokenModule,
    UserModule,
    FinancialModule,
    S3Module,
  ],
  controllers: [TripController],
  providers: [TripService],
  exports: [TripService]
})
export class TripModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CurrentUserMiddleware)
      .forRoutes('*');
  }
}

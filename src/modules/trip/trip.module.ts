import { MiddlewareConsumer, Module } from '@nestjs/common';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { MapModule } from '../map/map.module';
import { CurrentUserMiddleware } from 'src/modules/user/current-user.middleware';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [
    PrismaModule,
    MapModule,
    TokenModule,
    UserModule,
    FinancialModule
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

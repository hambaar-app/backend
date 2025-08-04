import { MiddlewareConsumer, Module } from '@nestjs/common';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { MapModule } from '../map/map.module';
import { CurrentUserMiddleware } from 'src/common/current-user.middleware';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PrismaModule,
    MapModule,
    TokenModule,
    UserModule,
  ],
  controllers: [TripController],
  providers: [TripService]
})
export class TripModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CurrentUserMiddleware)
      .forRoutes('*');
  }
}

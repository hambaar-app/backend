import { MiddlewareConsumer, Module } from '@nestjs/common';
import { PackageService } from './package.service';
import { PackageController } from './package.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { MapModule } from '../map/map.module';
import { PricingModule } from '../pricing/pricing.module';
import { S3Module } from '../s3/s3.module';
import { MatchingService } from './matching.service';
import { TripModule } from '../trip/trip.module';
import { TurfModule } from '../turf/turf.module';


@Module({
  imports: [
    PrismaModule,
    TokenModule,
    UserModule,
    MapModule,
    PricingModule,
    S3Module,
    TripModule,
    TurfModule
  ],
  providers: [
    PackageService,
    MatchingService,
  ],
  controllers: [PackageController]
})
export class PackageModule {
  configure() {}
}

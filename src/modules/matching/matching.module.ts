import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MapService } from '../map/map.service';
import { TokenModule } from '../token/token.module';
import { PackageModule } from '../package/package.module';

@Module({
  imports: [
    PrismaModule,
    TokenModule,
    MapService,
    PackageModule,
  ],
  providers: [MatchingService]
})
export class MatchingModule {}

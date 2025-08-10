import { Module } from '@nestjs/common';
import { MatchingService } from '../package/matching.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { PackageModule } from '../package/package.module';

@Module({
  imports: [
    PrismaModule,
    PackageModule,
  ],
  providers: [MatchingService],
  exports: [MatchingService]
})
export class MatchingModule {}

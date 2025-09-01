import { Module } from '@nestjs/common';
import { MapService } from './map.service';
import { HttpModule } from '@nestjs/axios';
import { MapController } from './map.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    TokenModule
  ],
  providers: [MapService],
  exports: [MapService],
  controllers: [MapController]
})
export class MapModule {}

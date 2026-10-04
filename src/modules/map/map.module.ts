import { Module } from '@nestjs/common';
import { MapService } from './map.service';
import { HttpModule } from '@nestjs/axios';
import { MapController } from './map.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { NeshanMapsAdapter } from '../../infra/maps/neshan-maps.adapter';
import { PORTS } from '../../infra/ports/ports.tokens';

@Module({
  imports: [HttpModule, PrismaModule, TokenModule],
  providers: [MapService, { provide: PORTS.MAPS, useClass: NeshanMapsAdapter }],
  exports: [MapService, PORTS.MAPS],
  controllers: [MapController],
})
export class MapModule {}

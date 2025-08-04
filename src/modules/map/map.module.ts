import { Module } from '@nestjs/common';
import { MapService } from './map.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [MapService],
  exports: [MapService]
})
export class MapModule {}

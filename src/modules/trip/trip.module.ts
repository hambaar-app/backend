import { Module } from '@nestjs/common';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { MapModule } from '../map/map.module';

@Module({
  imports: [MapModule],
  controllers: [TripController],
  providers: [TripService]
})
export class TripModule {}

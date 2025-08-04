import { Controller, Get, Query } from '@nestjs/common';
import { CoordinatesQueryDto } from './dto/coordinates-query.dto';
import { TripService } from './trip.service';

@Controller('trips')
export class TripController {
  constructor(private tripService: TripService) {}

  @Get('intermediate-cities')
  async getIntermediateCities(@Query() query: CoordinatesQueryDto) {
    return this.tripService.getIntermediateCities(query);
  }
}

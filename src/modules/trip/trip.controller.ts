import { Controller } from '@nestjs/common';
import { TripService } from './trip.service';

@Controller('trips')
export class TripController {
  constructor(private tripService: TripService) {}
}

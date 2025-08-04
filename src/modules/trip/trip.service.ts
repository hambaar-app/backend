import { Injectable } from '@nestjs/common';
import { MapService } from '../map/map.service';
import { CoordinatesQueryDto } from './dto/coordinates-query.dto';

@Injectable()
export class TripService {
  constructor(private mapService: MapService) {}

  async getIntermediateCities(
    {
      origin,
      destination
    }: CoordinatesQueryDto
  ) {
    const [originLat, originLng] = origin.split(',');
    const [destLat, destLng] = destination.split(',');
    return this.mapService.getIntermediateCities(
      {
        latitude: originLat,
        longitude: originLng,
      },
      {
        latitude: destLat,
        longitude: destLng,
      },
    );
  }
}

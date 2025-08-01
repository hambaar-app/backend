import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CalculateDistanceInput, CalculateDistanceResult, DistanceMatrixResponse } from './map.types';
import { ConfigService } from '@nestjs/config';
import { TripTypeEnum } from 'generated/prisma';

@Injectable()
export class MapService {
  private mapApiUrl: string;
  private mapApiKey: string;

  constructor(config: ConfigService) {
    this.mapApiKey = config.getOrThrow<string>('MAP_API_KEY');
    this.mapApiUrl = config.getOrThrow<string>('MAP_API_URL');
  }

  async calculateDistance(
    {
      vehicleType,
      tripType,
      origin,
      destination
    }: CalculateDistanceInput
  ): Promise<CalculateDistanceResult> {
    const url = this.mapApiUrl + '/distance-matrix'
      + (tripType === TripTypeEnum.intercity ? '/no-traffic' : '')
      + '?type=' + vehicleType
      + '&origins=' + origin.latitude + ',' + origin.longitude
      + '&destinations=' + destination.latitude + ',' + destination.longitude;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Key': this.mapApiKey,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json();
      const errorCode =response.status;

      if (errorCode === 407) {
        throw new BadRequestException('Invalid geographic coordinates provided.');
      }

      console.error(errorBody);
      throw new InternalServerErrorException('Something wrong.');      
    }

    const data: DistanceMatrixResponse = await response.json();
    return {
      duration: data.rows[0].elements[0].duration.value / 60,
      distance: data.rows[0].elements[0].distance.value / 1000
    };
  }
}

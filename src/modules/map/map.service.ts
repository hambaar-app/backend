import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CalculateDistanceInput, CalculateDistanceResult, DistanceMatrixResponse } from './map.types';
import { ConfigService } from '@nestjs/config';
import { TripTypeEnum } from 'generated/prisma';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class MapService {
  private mapApiUrl: string;
  private mapApiKey: string;

  constructor(
    private httpService: HttpService,
    config: ConfigService
  ) {
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

    try {
      const response: AxiosResponse<DistanceMatrixResponse> = await firstValueFrom(
        this.httpService.get<DistanceMatrixResponse>(url, {
          headers: {
            'Api-Key': this.mapApiKey,
          },
        })
      );

      const data = response.data;
      return {
        duration: data.rows[0].elements[0].duration.value / 60,
        distance: data.rows[0].elements[0].distance.value / 1000
      };
    } catch (error) {
      if (error.response) {
        const errorCode = error.response.status;
        const errorBody = error.response.data;
        
        if (errorCode === 407) {
          throw new BadRequestException('Invalid geographic coordinates provided.');
        }
        
        console.error('API Error:', errorBody);
        throw new InternalServerErrorException('Something wrong.');
      }
      
      // Network or other errors
      console.error('Request Error:', error.message);
      throw new InternalServerErrorException('Failed to calculate distance.');
    }
  }
}

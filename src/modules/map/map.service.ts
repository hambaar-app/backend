import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CalculateDistanceInput, CalculateDistanceResult, DistanceMatrixResponse, RoutingResponse, RoutingDto } from './map.types';
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
      const params = new URLSearchParams();
      params.append('type', vehicleType);
      params.append('origin', `${origin.latitude},${origin.longitude}`);
      params.append('destination', `${destination.latitude},${destination.longitude}`);

    const url = this.mapApiUrl + '/distance-matrix'
      + (tripType === TripTypeEnum.intercity ? '/no-traffic' : '')
      + `?${params.toString()}`;

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

  async getDirections(
    {
      type = 'car',
      origin,
      destination
    }: RoutingDto
  ): Promise<RoutingResponse> {
    try {
      const params = new URLSearchParams();
      params.append('type', type);
      params.append('origin', `${origin.latitude},${origin.longitude}`);
      params.append('destination', `${destination.latitude},${destination.longitude}`);

      const url = `${this.mapApiUrl}/v4/direction?${params.toString()}`;
      
      const response: AxiosResponse<RoutingResponse> = await firstValueFrom(
        this.httpService.get<RoutingResponse>(url, {
          headers: {
            'Api-Key': this.mapApiKey,
          },
        })
      );

      return response.data;
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
      throw new InternalServerErrorException('Failed to get directions.');
    }
  }
}

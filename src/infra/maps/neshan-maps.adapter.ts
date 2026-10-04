import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MapsPort } from '../ports/ports';
import {
  CalculateDistanceInput,
  Location,
  ReverseGeocodingResponse,
  RoutingDto,
  RoutingResponse,
} from '../../modules/map/map.types';

/**
 * Neshan Maps adapter (Phase 5 Task 1).
 *
 * Owns every Neshan HTTP call, moved verbatim from `MapService` (URLs,
 * params, headers, 407 → `BadRequestException` mapping and thrown messages
 * unchanged). `console.*` logging became Nest `Logger` with the same text.
 * Pure route math stays in `MapService` / `map/route-filters.ts`.
 */
@Injectable()
export class NeshanMapsAdapter implements MapsPort {
  private readonly logger = new Logger(NeshanMapsAdapter.name);
  private mapApiUrl: string;
  private mapApiKey: string;

  constructor(
    private httpService: HttpService,
    config: ConfigService,
  ) {
    this.mapApiKey = config.getOrThrow<string>('MAP_API_KEY');
    this.mapApiUrl = config.getOrThrow<string>('MAP_API_URL');
  }

  async calculateDistance({
    vehicleType = 'car',
    tripType = 'intercity',
    origin,
    destination,
    waypoints,
  }: CalculateDistanceInput) {
    const directions = await this.getDirections({
      vehicleType,
      tripType,
      origin,
      destination,
      waypoints,
    });

    const { distance, duration } = directions.routes[0].legs.reduce(
      (l, p) => ({
        distance: l.distance + p.distance.value,
        duration: l.duration + p.duration.value,
      }),
      {
        distance: 0,
        duration: 0,
      },
    );

    return {
      distance: Number((distance / 1000).toFixed(2)),
      duration: Number((duration / 60).toFixed(0)),
    };
  }

  async reverseGeocode({
    latitude,
    longitude,
  }: Location): Promise<ReverseGeocodingResponse> {
    try {
      const url = `${this.mapApiUrl}/v5/reverse?lat=${latitude}&lng=${longitude}`;

      const response: AxiosResponse<ReverseGeocodingResponse> =
        await firstValueFrom(
          this.httpService.get<ReverseGeocodingResponse>(url, {
            headers: {
              'Api-Key': this.mapApiKey,
            },
          }),
        );

      return response.data;
    } catch (error) {
      const { response, message } = axiosErrorShape(error);
      this.logger.error(
        'Error calling Neshan reverse geocoding API:',
        response?.data || message,
      );
      throw new InternalServerErrorException('Failed to reverse geocode.');
    }
  }

  async getDirections({
    vehicleType = 'car',
    tripType = 'intercity',
    origin,
    destination,
    waypoints,
  }: RoutingDto): Promise<RoutingResponse> {
    try {
      const params = new URLSearchParams();
      params.append('type', vehicleType);
      params.append('origin', `${origin.latitude},${origin.longitude}`);
      params.append(
        'destination',
        `${destination.latitude},${destination.longitude}`,
      );

      let waypointsString = '';
      if (waypoints && waypoints.length > 0) {
        waypointsString = waypoints
          .map(({ latitude, longitude }) => `${latitude},${longitude}`)
          .join('|');
        params.append('waypoints', waypointsString);
      }

      const url =
        `${this.mapApiUrl}/v4/direction` +
        `${tripType === 'intercity' ? '/no-traffic' : ''}` +
        `?${params.toString()}`;

      const response: AxiosResponse<RoutingResponse> = await firstValueFrom(
        this.httpService.get<RoutingResponse>(url, {
          headers: {
            'Api-Key': this.mapApiKey,
          },
        }),
      );

      return response.data;
    } catch (error) {
      const { response, message } = axiosErrorShape(error);
      const errorBody = response?.data;
      if (response) {
        if (response.status === 407) {
          throw new BadRequestException(
            'Invalid geographic coordinates provided.',
          );
        }

        this.logger.error('API Error:', errorBody);
        throw new InternalServerErrorException('Something wrong.');
      }

      this.logger.error(
        'Error calling Neshan directions API:',
        errorBody || message,
      );
      throw new InternalServerErrorException('Failed to get directions.');
    }
  }
}

/** Typed view over unknown axios failures (keeps `no-unsafe-*` quiet). */
function axiosErrorShape(error: unknown): {
  response?: { status?: number; data?: unknown };
  message?: string;
} {
  if (typeof error === 'object' && error !== null) {
    const { response, message } = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    return { response, message };
  }
  return {};
}

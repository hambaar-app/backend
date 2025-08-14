import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CalculateDistanceInput,
  CalculateDistanceResult,
  DistanceMatrixResponse,
  RoutingResponse,
  RoutingDto,
  Location,
  ReverseGeocodingResponse,
  NeshanRoute,
  VehicleTypes,
} from './map.types';
import { ConfigService } from '@nestjs/config';
import { TripTypeEnum } from 'generated/prisma';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { CityDto } from '../trip/dto/city.dto';

@Injectable()
export class MapService {
  private mapApiUrl: string;
  private mapApiKey: string;

  constructor(
    private httpService: HttpService,
    config: ConfigService,
  ) {
    this.mapApiKey = config.getOrThrow<string>('MAP_API_KEY');
    this.mapApiUrl = config.getOrThrow<string>('MAP_API_URL');
  }

  async calculateDistance(
    {
      vehicleType = 'car',
      tripType = 'intercity',
      origins,
      destinations,
      waypoints
    }: CalculateDistanceInput
  ): Promise<CalculateDistanceResult> {
    if (waypoints) {
      return this.calculateDistanceWithWaypoints({
        vehicleType,
        origins,
        destinations,
        waypoints
     });
    }

    const params = new URLSearchParams();
    params.append('type', vehicleType);

    const originsString = origins
      .map(({ latitude, longitude }) => `${latitude},${longitude}`)
      .join('|');
    params.append('origins', originsString);

    const destinationsString = destinations
      .map(({ latitude, longitude }) => `${latitude},${longitude}`)
      .join('|');
    params.append('destinations', destinationsString);

    const url = this.mapApiUrl + '/v1/distance-matrix' +
      (tripType === TripTypeEnum.intercity ? '/no-traffic' : '') + `?${params.toString()}`;

    try {
      const response: AxiosResponse<DistanceMatrixResponse> = await firstValueFrom(
        this.httpService.get<DistanceMatrixResponse>(url, {
          headers: {
            'Api-Key': this.mapApiKey,
          },
        }),
      );

      const data = response.data;
      return {
        distance: data.rows[0].elements[0].distance.value / 1000,
        duration: data.rows[0].elements[0].duration.value / 60,
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

      console.error(
        'Error calling Neshan distance matrix API:',
        error.response?.data || error.message
      );
      throw new InternalServerErrorException('Failed to calculate distance.');
    }
  }

  private async calculateDistanceWithWaypoints(
    {
      vehicleType,
      origins,
      destinations,
      waypoints
    }: CalculateDistanceInput
  ) {
    if (!waypoints) {
      return this.calculateDistance({
        vehicleType,
        origins,
        destinations
      });
    }

    const directions = await this.getDirections({
      type: vehicleType,
      origin: origins[0],
      destination: origins[0],
      waypoints
    });
    
    const { distance, duration } = directions.routes[0].legs.reduce(
      (l, p) => ({
        distance: l.distance + p.distance.value,
        duration: l.duration + p.duration.value
      }),
      {
        distance: 0,
        duration: 0
      }
    );

    return {
      distance: distance / 1000,
      duration: duration / 60
    };
  }

  private async getDirections(
    {
      type = 'car',
      origin,
      destination,
      waypoints
    }: RoutingDto
  ): Promise<RoutingResponse> {
    try {
      const params = new URLSearchParams();
      params.append('type', type);
      params.append('origin', `${origin.latitude},${origin.longitude}`);
      params.append('destination', `${destination.latitude},${destination.longitude}`);

      let waypointsString = '';
      if (waypoints && waypoints.length > 0) {
        waypointsString = waypoints
        .map(({ latitude, longitude }) => `${latitude},${longitude}`)
        .join('|');
        console.log(waypoints, waypointsString);
        
        params.append('waypoints', waypointsString);
      }

      const url = `${this.mapApiUrl}/v4/direction`
        + `${type === 'car' ? '/no-traffic' : ''}`
        + `?${params.toString()}`;

      const response: AxiosResponse<RoutingResponse> = await firstValueFrom(
        this.httpService.get<RoutingResponse>(url, {
          headers: {
            'Api-Key': this.mapApiKey,
          },
        }),
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

      console.error(
        'Error calling Neshan directions API:',
        error.response?.data || error.message
      );
      throw new InternalServerErrorException('Failed to get directions.');
    }
  }

  async getIntermediateCities(
    origin: Location,
    destination: Location,
    vehicleType: VehicleTypes = 'car',
  ): Promise<CityDto[]> {
    try {
      // Get the route
      const routeResponse = await this.getDirections({
        type: vehicleType,
        origin,
        destination,
      });

      if (!routeResponse.routes.length) {
        return [];
      }

      const route = routeResponse.routes[0];
      const significantPoints = this.extractSignificantPoints(route);

      // Process points
      const reverseGeocodePromises = significantPoints.map(async (point, index) => {
        try {
          await this.delay(index * 100);

          const reverseGeocode = await this.reverseGeocode({
            latitude: String(point.lat),
            longitude: String(point.lng),
          });

          const cityName = reverseGeocode.county ?? reverseGeocode.city;
          if (reverseGeocode.status === 'OK' && cityName) {
            return {
              name: cityName,
              latitude: point.lat,
              longitude: point.lng
            };
          }
          return null;
        } catch (error) {
          console.warn(`Failed to reverse geocode point ${point.lat}, ${point.lng}: ${error.message}.`);
          return null;
        }
      });

      const cities = (await Promise.all(reverseGeocodePromises)).filter(
        city => city !== null
      );

      return [...new Set(cities.map(c => c.name))]
        .map(cityName => {
          const c = cities.find(c => c.name === cityName);
          return {
            name: c!.name.replace('شهرستان ', ''),
            latitude: String(c!.latitude),
            longitude: String(c!.longitude)
          };
        });
    } catch (error) {
      console.error(
        'Error getting intermediate cities:',
        error.response?.data || error.message
      );
      throw new InternalServerErrorException('Failed to get intermediate cities.');
    }
  }

  private async reverseGeocode(
    {
      latitude,
      longitude
    }: Location
  ): Promise<ReverseGeocodingResponse> {
    try {
      const url = `${this.mapApiUrl}/v5/reverse?lat=${latitude}&lng=${longitude}`;

      const response: AxiosResponse<ReverseGeocodingResponse> = await firstValueFrom(
        this.httpService.get<ReverseGeocodingResponse>(url, {
          headers: {
            'Api-Key': this.mapApiKey,
          },
        }),
      );

      return response.data;
    } catch (error) {
      console.error(
        'Error calling Neshan reverse geocoding API:',
        error.response?.data || error.message
      );
      throw new InternalServerErrorException('Failed to reverse geocode.');
    }
  }

  private extractSignificantPoints(route: NeshanRoute): Array<{ lat: number; lng: number }> {
    const points: Array<{ lat: number; lng: number }> = [];
    const minDistanceThreshold = 10000; // minimum distance between points
    const priorityStepTypes = [
      'roundabout',
      'rotary',
      'merge',
      'turn',
      'fork',
      'on ramp',
      'off ramp',
      'roundabout turn',
      'exit roundabout',
      'exit rotary',
    ];

    // Include origin
    const firstStep = route.legs[0].steps[0];
    points.push({
      lat: firstStep.start_location[1],
      lng: firstStep.start_location[0],
    });

    // Select points from steps with priority point types or significant instructions (Includes 'وارد')
    let lastPoint: { lat: number; lng: number } | undefined;
    for (const leg of route.legs) {
      for (const step of leg.steps) {
        const currentPoint = {
          lat: step.start_location[1],
          lng: step.start_location[0],
        };
        
        const pushPointCondition = ((step.instruction && step.instruction.includes('وارد')) ||
            priorityStepTypes.includes(step.type) || step.distance.value > minDistanceThreshold) &&
          (!lastPoint || this.haversineDistance(lastPoint, currentPoint) > minDistanceThreshold)
        if (pushPointCondition) {
          points.push(currentPoint);
          lastPoint = currentPoint;
        }
      }
    }

    return points;
  }

  // calculates the great-circle distance between two points on the Earth's surface,
  // given their latitude and longitude coordinates.
  private haversineDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (+point1.lat * Math.PI) / 180;
    const φ2 = (+point2.lat * Math.PI) / 180;
    const Δφ = ((+point2.lat - +point1.lat) * Math.PI) / 180;
    const Δλ = ((+point2.lng - +point1.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Make a pause between API requests
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

import {
  Injectable,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import {
  CalculateDistanceInput,
  RoutingResponse,
  RoutingDto,
  Location,
  ReverseGeocodingResponse,
  NeshanRoute,
  VehicleTypes,
} from './map.types';
import { CityDto } from './dto/city.dto';
import { CityRepository } from '../prisma/repositories/city.repository';
import { CoordinatesQueryDto } from './coordinates-query.dto';
import { PORTS } from '../../infra/ports/ports.tokens';
import { MapsPort } from '../../infra/ports/ports';

@Injectable()
export class MapService {
  constructor(
    @Inject(PORTS.MAPS) private maps: MapsPort,
    private cities: CityRepository,
  ) {}

  async calculateDistance({
    vehicleType = 'car',
    tripType = 'intercity',
    origin,
    destination,
    waypoints,
  }: CalculateDistanceInput) {
    return this.maps.calculateDistance({
      vehicleType,
      tripType,
      origin,
      destination,
      waypoints,
    });
  }

  async reverseGeocode({
    latitude,
    longitude,
  }: Location): Promise<ReverseGeocodingResponse> {
    return this.maps.reverseGeocode({ latitude, longitude });
  }

  async getIntermediateCitiesWithCoords({
    origin,
    destination,
  }: CoordinatesQueryDto) {
    const [originLat, originLng] = origin.split(',');
    const [destLat, destLng] = destination.split(',');
    return this.getIntermediateCities(
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

  async getIntermediateCitiesWithIds(originId: string, destinationId: string) {
    const originCity = await this.cities.findCityOrThrow(originId);

    const destinationCity = await this.cities.findCityOrThrow(destinationId);

    return this.getIntermediateCities(
      {
        latitude: originCity.latitude,
        longitude: originCity.longitude,
      },
      {
        latitude: destinationCity.latitude,
        longitude: destinationCity.longitude,
      },
    );
  }

  async getDirections({
    vehicleType = 'car',
    tripType = 'intercity',
    origin,
    destination,
    waypoints,
  }: RoutingDto): Promise<RoutingResponse> {
    return this.maps.getDirections({
      vehicleType,
      tripType,
      origin,
      destination,
      waypoints,
    });
  }

  private async getIntermediateCities(
    origin: Location,
    destination: Location,
    vehicleType: VehicleTypes = 'car',
  ): Promise<CityDto[]> {
    try {
      // Get the route
      const routeResponse = await this.getDirections({
        vehicleType,
        origin,
        destination,
      });

      if (!routeResponse.routes.length) {
        return [];
      }

      const route = routeResponse.routes[0];
      const significantPoints = this.extractSignificantPoints(route);

      // Process points
      const reverseGeocodePromises = significantPoints.map(
        async (point, index) => {
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
                longitude: point.lng,
              };
            }
            return null;
          } catch (error) {
            console.warn(
              `Failed to reverse geocode point ${point.lat}, ${point.lng}: ${error.message}.`,
            );
            return null;
          }
        },
      );

      const cities = (await Promise.all(reverseGeocodePromises)).filter(
        (city) => city !== null,
      );

      return [...new Set(cities.map((c) => c.name))].map((cityName) => {
        const c = cities.find((c) => c.name === cityName);
        return {
          name: c!.name.replace('شهرستان ', ''),
          latitude: String(c!.latitude),
          longitude: String(c!.longitude),
        };
      });
    } catch (error) {
      console.error(
        'Error getting intermediate cities:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Failed to get intermediate cities.',
      );
    }
  }

  private extractSignificantPoints(
    route: NeshanRoute,
  ): Array<{ lat: number; lng: number }> {
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

        const pushPointCondition =
          ((step.instruction && step.instruction.includes('وارد')) ||
            priorityStepTypes.includes(step.type) ||
            step.distance.value > minDistanceThreshold) &&
          (!lastPoint ||
            this.haversineDistance(lastPoint, currentPoint) >
              minDistanceThreshold);
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
    point2: { lat: number; lng: number },
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (+point1.lat * Math.PI) / 180;
    const φ2 = (+point2.lat * Math.PI) / 180;
    const Δφ = ((+point2.lat - +point1.lat) * Math.PI) / 180;
    const Δλ = ((+point2.lng - +point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Make a pause between API requests
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

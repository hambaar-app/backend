import {
  Injectable,
  InternalServerErrorException,
  Inject,
  Logger,
} from '@nestjs/common';
import {
  CalculateDistanceInput,
  RoutingResponse,
  RoutingDto,
  Location,
  ReverseGeocodingResponse,
  VehicleTypes,
} from './map.types';
import { CityDto } from './dto/city.dto';
import { CityRepository } from '../prisma/repositories/city.repository';
import { CoordinatesQueryDto } from './coordinates-query.dto';
import { PORTS } from '../../infra/ports/ports.tokens';
import { MapsPort } from '../../infra/ports/ports';
import { extractSignificantPoints } from './route-filters';

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);

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
      const significantPoints = extractSignificantPoints(route);

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
          } catch (error: unknown) {
            const detail =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Failed to reverse geocode point ${point.lat}, ${point.lng}: ${detail}.`,
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
    } catch (error: unknown) {
      this.logger.error(
        'Error getting intermediate cities:',
        axiosFailureDetail(error),
      );
      throw new InternalServerErrorException(
        'Failed to get intermediate cities.',
      );
    }
  }

  // Make a pause between API requests
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Best-effort detail string for unknown axios-style failures. */
function axiosFailureDetail(error: unknown): unknown {
  if (typeof error === 'object' && error !== null) {
    const { response, message } = error as {
      response?: { data?: unknown };
      message?: unknown;
    };
    return response?.data ?? message;
  }
  return error;
}

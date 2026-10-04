import {
  CalculateDistanceInput,
  CalculateDistanceResult,
  Location,
  ReverseGeocodingResponse,
  RoutingDto,
  RoutingResponse,
} from '../../modules/map/map.types';

/**
 * Infrastructure ports (Phase 5 Task 1).
 *
 * Plain interfaces (no Nest) for every external-world interaction. Adapters
 * implement these; application services depend only on the ports via the
 * `PORTS.*` injection tokens, so unit tests swap in fakes without HTTP,
 * AWS or SDK clients.
 */
export interface StoragePort {
  generatePutPresignedUrl(keyName: string, expiresIn?: number): Promise<string>;
  generateGetPresignedUrl(
    keyName: string | undefined | null,
    expiresIn?: number,
  ): Promise<string>;
  deleteFile(key: string): Promise<void>;
  fileExists(key: string): Promise<boolean>;
}

export interface SmsPort {
  sendSms(mobiles: string[], message: string): Promise<boolean>;
  sendOtp(mobile: string, code: string): Promise<boolean>;
}

export interface MapsPort {
  calculateDistance(
    input: CalculateDistanceInput,
  ): Promise<CalculateDistanceResult>;
  reverseGeocode(location: Location): Promise<ReverseGeocodingResponse>;
  getDirections(input: RoutingDto): Promise<RoutingResponse>;
}

import { TripTypeEnum } from 'generated/prisma';

export interface CalculateDistanceInput {
  vehicleType: 'car' | 'motorcycle',
  tripType: TripTypeEnum,
  origin: Location,
  destination: Location
}

interface Location {
  latitude: string,
  longitude: string
}

export interface DistanceMatrixResponse {
  status: "Ok";
  rows: Row[];
  origin_addresses: string[];
  destination_addresses: string[];
}

interface Row {
  elements: Element[];
}

interface Element {
  status: 'Ok' | 'NoRoute' | 'UnknownError';
  duration: Duration;
  distance: Distance;
}

interface Duration {
  value: number;
  text: string;
}

interface Distance {
  value: number;
  text: string;
}

export interface CalculateDistanceResult {
  duration: number;
  distance: number;
}
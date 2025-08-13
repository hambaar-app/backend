import { TripTypeEnum } from 'generated/prisma';

export type VehicleTypes = 'car' | 'motorcycle';

export interface CalculateDistanceInput {
  vehicleType: VehicleTypes,
  tripType: TripTypeEnum,
  origins: Location[],
  destinations: Location[]
}

export interface Location {
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

export class RoutingDto {
  type?: VehicleTypes;
  origin: Location;
  destination: Location;
}

export interface RoutingResponse {
  routes: NeshanRoute[];
}

export interface NeshanRoute {
  overview_polyline: { points: string };
  legs: NeshanRouteLeg[];
}

interface NeshanRouteLeg {
  summary: string;
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  steps: NeshanRouteStep[];
}

interface NeshanRouteStep {
  name: string;
  instruction: string;
  bearing_after: number;
  type: string;
  modifier: string;
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  polyline: string;
  start_location: [number, number];
}

export interface ReverseGeocodingResponse {
  status: string;
  formatted_address: string;
  route_name: string;
  route_type: string;
  neighbourhood: string;
  city: string;
  state: string;
  place: string | null;
  municipality_zone: string;
  in_traffic_zone: string;
  in_odd_even_zone: string;
  village: string | null;
  county: string;
  district: string;
}
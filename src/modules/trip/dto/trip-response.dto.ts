import { TripStatusEnum, TripTypeEnum } from 'generated/prisma';
import { AddressResponseDto } from 'src/modules/address/dto/address-response.dto';
import { IntermediateCityDto } from './intermediate-city.dto';

export class TripCompactResponseDto {
  id: string;

  origin: AddressResponseDto;

  destination: AddressResponseDto;

  waypoints: IntermediateCityDto[];

  tripType: TripTypeEnum;

  vehicleId: string;

  maxPackageWeightGr: number;

  availableCapacityKg: number;

  restrictedItems?: string[];

  departureTime: [Date, Date];

  tripStatus: TripStatusEnum;

  description?: string;

  createdAt: Date;

  updatedAt: Date;

  deletedAt: Date;
}

/**
  deliveryRequests
  matchedRequests
  vehicle
 */
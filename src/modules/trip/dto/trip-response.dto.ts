import { TripStatusEnum, TripTypeEnum } from 'generated/prisma';
import { AddressResponseDto } from 'src/modules/address/dto/address-response.dto';
import { IntermediateCityDto } from './intermediate-city.dto';
import { Expose, Transform, Type } from 'class-transformer';
import { VehicleResponseDto } from 'src/modules/vehicle/dto/vehicle-response.dto';

export class TripCompactResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.origin?.persianName)
  origin: string;

  @Expose()
  @Transform(({ obj }) => obj.destination?.persianName)
  destination: string;

  @Expose()
  @Type(() => IntermediateCityDto)
  waypoints: IntermediateCityDto[];

  @Expose()
  tripType: TripTypeEnum;

  @Expose()
  vehicleId: string;

  @Expose()
  maxPackageWeightGr: number;

  @Expose()
  restrictedItems?: string[];

  @Expose()
  departureTime: [Date, Date];

  @Expose()
  tripStatus: TripStatusEnum;

  @Expose()
  description?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt: Date;
}

export class TripResponseDto extends TripCompactResponseDto {
  @Expose()
  @Type(() => VehicleResponseDto)
  vehicle: VehicleResponseDto;
}

/**
  deliveryRequests
  matchedRequests
 */
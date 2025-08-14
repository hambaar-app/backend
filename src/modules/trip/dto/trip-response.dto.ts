import { TripStatusEnum, TripTypeEnum } from 'generated/prisma';
import { CityDto } from './city.dto';
import { Expose, Transform, Type } from 'class-transformer';
import { VehicleCompactResponseDto } from 'src/modules/vehicle/dto/vehicle-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class TripCompactResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => CityDto)
  origin: CityDto;

  @Expose()
  @Type(() => CityDto)
  destination: CityDto;

  @Expose()
  @Type(() => CityDto)
  @Transform(({ value }) => value?.filter(v => v.isVisible))
  waypoints: CityDto[];

  @ApiProperty({ enum: TripTypeEnum })
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

  @ApiProperty({ enum: TripStatusEnum })
  @Expose()
  status: TripStatusEnum;

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
  @Type(() => VehicleCompactResponseDto)
  vehicle: VehicleCompactResponseDto;
}

export class MatchedTripResponseDto extends TripResponseDto {
  @Expose()
  additionalPrice: number;
}
import { TripStatusEnum, TripTypeEnum } from 'generated/prisma';
import { CityDto } from './city.dto';
import { Expose, Transform, Type } from 'class-transformer';
import { VehicleCompactResponseDto } from 'src/modules/vehicle/dto/vehicle-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class TripCompactResponseDto {
  @Expose()
  id: string;

  @ApiProperty({ type: CityDto })
  @Expose()
  @Type(() => CityDto)
  origin: CityDto;

  @ApiProperty({ type: CityDto })
  @Expose()
  @Type(() => CityDto)
  destination: CityDto;

  @ApiProperty({ type: [CityDto] })
  @Expose()
  @Type(() => CityDto)
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

class TripCompactPlusResponseDto extends TripCompactResponseDto {
  @Expose()
  @Type(() => VehicleCompactResponseDto)
  vehicle: VehicleCompactResponseDto;
}

export class TripResponseDto extends TripCompactPlusResponseDto {
  @Expose()
  normalDistanceKm: number;

  @Expose()
  normalDurationMin: number;

  @Expose()
  totalDeviationDistanceKm: number;

  @Expose()
  totalDeviationDurationMin: number;
}

export class MatchedTripResponseDto extends TripCompactPlusResponseDto {
  @Expose()
  additionalPrice: number;
}
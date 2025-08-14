import { TripStatusEnum, TripTypeEnum } from 'generated/prisma';
import { IntermediateCityDto } from './intermediate-city.dto';
import { Expose, Transform, Type } from 'class-transformer';
import { VehicleCompactResponseDto } from 'src/modules/vehicle/dto/vehicle-response.dto';
import { ApiProperty } from '@nestjs/swagger';

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

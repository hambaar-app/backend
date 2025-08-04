import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Validate,
} from 'class-validator';
import { IsValidDateTimeTupleConstraint } from 'src/common/utilities';
import { IntermediateCityDto } from './intermediate-city.dto';
import { Type } from 'class-transformer';

export class CreateTripDto {
  @IsNotEmpty()
  @IsUUID()
  originId: string;

  @IsNotEmpty()
  @IsUUID()
  destinationId: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => IntermediateCityDto)
  waypoints?: IntermediateCityDto[];

  // tripType just intercity

  @IsNotEmpty()
  @IsUUID()
  vehicleId: string;

  @IsNotEmpty()
  @IsInt()
  maxPackageWeightGr: number;

  @IsNotEmpty()
  @Min(1)
  @IsNumber()
  availableCapacityKg: number;

  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  restrictedItems?: string[];

  @ApiProperty({
    example: '["2025-07-29T10:00:00.000Z", "2025-07-29T12:00:00.000Z"]',
  })
  @IsNotEmpty()
  @Validate(IsValidDateTimeTupleConstraint)
  departureTime: [Date, Date];

  @IsOptional()
  @IsString()
  description?: string;
}

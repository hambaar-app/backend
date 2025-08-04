import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Validate,
} from 'class-validator';
import { IntermediateCityDto } from './intermediate-city.dto';
import { Type } from 'class-transformer';
import { IsValidDateTimeTupleConstraint } from 'src/common/utilities';

export class UpdateTripDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => IntermediateCityDto)
  waypoints?: IntermediateCityDto[];

  @IsOptional()
  @IsInt()
  maxPackageWeightGr?: number;

  @IsOptional()
  @Min(1)
  @IsNumber()
  availableCapacityKg?: number;

  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  restrictedItems?: string[];

  @ApiProperty({
    example: '["2025-07-29T10:00:00.000Z", "2025-07-29T12:00:00.000Z"]',
  })
  @IsOptional()
  @Validate(IsValidDateTimeTupleConstraint)
  departureTime?: [Date, Date];

  @IsOptional()
  @IsString()
  description?: string;
}

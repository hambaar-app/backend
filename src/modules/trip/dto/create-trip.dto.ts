import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
  ValidateNested,
} from 'class-validator';
import { IsValidDateTimeTupleConstraint } from '../../../common/utilities';
import { CityDto } from '../../map/dto/city.dto';
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
  @ValidateNested({ each: true })
  @Type(() => CityDto)
  waypoints?: CityDto[];

  @IsNotEmpty()
  @IsUUID()
  vehicleId: string;

  @IsOptional()
  @IsInt()
  maxPackageWeightGr?: number;

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

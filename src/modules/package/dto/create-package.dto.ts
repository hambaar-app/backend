import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Validate,
} from 'class-validator';
import { IsDeliveryAfterPickupConstraint, IsValidDateTimeTupleConstraint } from 'src/common/utilities';

export class CreatePackageDto {
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsArray()
  @IsString({ each: true })
  items: string[];

  @IsNotEmpty()
  @IsUUID()
  originAddressId: string;

  @IsNotEmpty()
  @IsUUID()
  recipientId: string;

  @ApiProperty({ description: 'In gr' })
  @IsNotEmpty()
  @IsInt()
  weight: number;

  @ApiProperty({
    description: 'In LxWxH format.',
    example: '20x30x40'
  })
  @Matches(/^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/, {
    message: 'dimensions should be in cm and "LxWxH" format.',
  })
  dimensions: string;

  @IsOptional()
  @IsInt()
  packageValue?: number;

  @IsNotEmpty()
  @IsBoolean()
  isFragile: boolean;

  @IsNotEmpty()
  @IsBoolean()
  isPerishable: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsBoolean()
  pickupAtOrigin: boolean;

  @IsNotEmpty()
  @IsBoolean()
  deliveryAtDestination: boolean;

  @ApiProperty({
    example: '["2025-07-29T10:00:00.000Z", "2025-07-29T12:00:00.000Z"]'
  })
  @IsOptional()
  @Validate(IsValidDateTimeTupleConstraint)
  preferredPickupTime: [Date, Date]; // [startDateTime, endDateTime]
  
  @ApiProperty({
    example: '["2025-07-29T10:00:00.000Z", "2025-07-29T12:00:00.000Z"]'
  })
  @IsOptional()
  @Validate(IsValidDateTimeTupleConstraint)
  @Validate(IsDeliveryAfterPickupConstraint)
  preferredDeliveryTime: [Date, Date]; // [startDateTime, endDateTime]

  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString()
  picturesKey: string[];
}

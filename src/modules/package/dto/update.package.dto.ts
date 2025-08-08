import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, Validate } from 'class-validator';
import { IsDeliveryAfterPickupConstraint, IsValidDateTimeTupleConstraint } from 'src/common/utilities';

export class UpdatePackageDto {
  @IsOptional()
  @ArrayMinSize(1)
  @IsArray()
  @IsString({ each: true })
  items?: string[];

  @ApiProperty({
    description: 'In LxWxH format.',
    example: '20x30x40'
  })
  @Matches(/^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/, {
    message: 'dimensions should be in cm and "LxWxH" format.',
  })
  @IsOptional()
  dimensions?: string;

  @IsOptional()
  @IsInt()
  finalPrice: number;

  @IsOptional()
  @IsInt()
  packageValue?: number;

  @IsOptional()
  @IsBoolean()
  isFragile?: boolean;

  @IsOptional()
  @IsBoolean()
  isPerishable?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  pickupAtOrigin?: boolean;

  @IsOptional()
  @IsBoolean()
  deliveryAtDestination?: boolean;

  @ApiProperty({
    example: '["2025-07-29T10:00:00.000Z", "2025-07-29T12:00:00.000Z"]'
  })
  @IsOptional()
  @Validate(IsValidDateTimeTupleConstraint)
  preferredPickupTime?: [Date, Date]; // [startDateTime, endDateTime]
  
  @ApiProperty({
    example: '["2025-07-29T10:00:00.000Z", "2025-07-29T12:00:00.000Z"]'
  })
  @IsOptional()
  @Validate(IsValidDateTimeTupleConstraint)
  @Validate(IsDeliveryAfterPickupConstraint)
  preferredDeliveryTime?: [Date, Date]; // [startDateTime, endDateTime]

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  picturesKey?: string[];
}

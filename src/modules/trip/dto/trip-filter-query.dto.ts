import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { TripStatusEnum } from 'generated/prisma';

export class TripFilterQueryDto {
  @ApiProperty({
    description: 'Array of status values to filter by',
    enum: TripStatusEnum,
    isArray: true,
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TripStatusEnum, { each: true } )
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim());
    }
    return Array.isArray(value) ? value : [value];
  })
  status?: TripStatusEnum[];
}
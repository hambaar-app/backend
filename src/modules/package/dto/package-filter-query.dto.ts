import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PackageStatusEnum } from 'generated/prisma';

export class PackageFilterQueryDto {
  @ApiProperty({
    description: 'Array of status values to filter by',
    enum: PackageStatusEnum,
    isArray: true,
    required: false,
    example: ['active', 'pending']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PackageStatusEnum, { each: true } )
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim());
    }
    return Array.isArray(value) ? value : [value];
  })
  status?: PackageStatusEnum[];

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsInt({ each: true })
  @Min(1)
  @Transform(({ value }) => Number(value))
  page?: number = 1;

  @ApiProperty({
    description: 'Number of packages per page',
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsInt({ each: true })
  @Min(1)
  @Transform(({ value }) => Number(value))
  limit?: number = 10;
}
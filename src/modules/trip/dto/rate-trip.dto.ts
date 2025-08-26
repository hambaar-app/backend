import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class RateTripDto {
  @IsNotEmpty()
  @IsUUID()
  tripId: string;

  @IsNotEmpty()
  @IsUUID()
  packageId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rate: number;

  @IsOptional()
  @IsString()
  comment: string;
}

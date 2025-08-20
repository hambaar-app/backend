import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTrackingDto {
  @IsNotEmpty()
  @IsLatitude()
  latitude?: string;

  @IsNotEmpty()
  @IsLongitude()
  longitude?: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  routeName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
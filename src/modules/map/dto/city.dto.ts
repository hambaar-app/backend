import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CityDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  name: string;
  
  @Expose()
  @IsNotEmpty()
  @Transform(({ value }) => String(value))
  @IsLatitude()
  latitude: string;
  
  @Expose()
  @IsNotEmpty()
  @Transform(({ value }) => String(value))
  @IsLongitude()
  longitude: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
import { Expose, Transform } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNotEmpty, IsString } from 'class-validator';

export class IntermediateCityDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  city: string;
  
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
}
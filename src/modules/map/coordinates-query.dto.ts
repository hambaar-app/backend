import { IsNotEmpty, IsLatLong, IsLatitude, IsLongitude } from 'class-validator';

export class CoordinateQueryDto {
  @IsNotEmpty()
  @IsLatitude()
  lat: string;
  
  @IsNotEmpty()
  @IsLongitude()
  lng: string;
}

export class CoordinatesQueryDto {
  @IsNotEmpty()
  @IsLatLong()
  origin: string;

  @IsNotEmpty()
  @IsLatLong()
  destination: string;
}
import { IsNotEmpty, IsLatLong, IsLatitude } from 'class-validator';

export class CoordinateQueryDto {
  @IsNotEmpty()
  @IsLatitude()
  lat: string;
  
  @IsNotEmpty()
  @IsLatitude()
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
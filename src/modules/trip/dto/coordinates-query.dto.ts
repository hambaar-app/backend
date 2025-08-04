import { IsNotEmpty, IsNumber, Min, Max, IsLatLong } from 'class-validator';

export class CoordinatesQueryDto {
  @IsNotEmpty()
  @IsLatLong()
  origin: string;

  @IsNotEmpty()
  @IsLatLong()
  destination: string;
}
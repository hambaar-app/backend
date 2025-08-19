import { IsNotEmpty, IsLatLong } from 'class-validator';

export class CoordinatesQueryDto {
  @IsNotEmpty()
  @IsLatLong()
  origin: string;

  @IsNotEmpty()
  @IsLatLong()
  destination: string;
}
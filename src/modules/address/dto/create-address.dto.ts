import { Exclude } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  province: string;

  @IsOptional()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  street: string;

  @IsNotEmpty()
  @IsString()
  details: string;

  @IsOptional()
  @IsInt()
  plate?: number;

  @IsOptional()
  @IsNumberString()
  postalCode?: string;

  @IsNotEmpty()
  @IsString()
  @IsLatitude()
  latitude: string;

  @IsNotEmpty()
  @IsString()
  @IsLongitude()
  longitude: string;

  @IsOptional()
  @IsBoolean()
  isHighlighted?: boolean;
}

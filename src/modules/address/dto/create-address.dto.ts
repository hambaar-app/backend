import { Transform } from 'class-transformer';
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

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty()
  @IsString()
  province: string;

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty()
  @IsString()
  city: string;

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty()
  @IsString()
  street: string;

  @Transform(({ value }) => value?.trim())
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

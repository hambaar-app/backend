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
  @Exclude()
  @IsOptional()
  @IsString()
  title?: string;

  @Exclude()
  @IsOptional()
  @IsString()
  country?: string;

  @Exclude()
  @IsOptional()
  @IsString()
  province: string;

  @Exclude()
  @IsOptional()
  @IsString()
  city: string;

  @Exclude()
  @IsNotEmpty()
  @IsString()
  street: string;

  @Exclude()
  @IsNotEmpty()
  @IsString()
  details: string;

  @Exclude()
  @IsOptional()
  @IsInt()
  plate?: number;

  @Exclude()
  @IsOptional()
  @IsNumberString()
  postalCode?: string;

  @Exclude()
  @IsNotEmpty()
  @IsString()
  @IsLatitude()
  latitude: string;

  @Exclude()
  @IsNotEmpty()
  @IsString()
  @IsLongitude()
  longitude: string;

  @Exclude()
  @IsOptional()
  @IsBoolean()
  isHighlighted?: boolean;
}

import {
  IsAlpha,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsPhoneNumber,
  IsUrl,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GendersEnum, LicenseTypeEnum } from 'generated/prisma';

export class SignupTransporterDto {
  @IsNotEmpty()
  @IsAlpha('fa-IR')
  firstName: string;

  @IsNotEmpty()
  @IsAlpha('fa-IR')
  lastName: string;

  @IsNotEmpty()
  @IsPhoneNumber('IR')
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: GendersEnum })
  @IsNotEmpty()
  @IsEnum(GendersEnum)
  gender: GendersEnum;

  @IsNotEmpty()
  @IsDateString()
  birthDate: Date;

  @IsNotEmpty()
  @Length(10, 10)
  @IsNumberString()
  nationalId: string;

  @IsNotEmpty()
  @Length(10, 10)
  @IsNumberString()
  licenseNumber: string;

  @ApiProperty({ enum: LicenseTypeEnum })
  @IsNotEmpty()
  @IsEnum(LicenseTypeEnum)
  licenseType: LicenseTypeEnum;

  @IsOptional()
  @IsUrl()
  profilePictureUrl: string;
}

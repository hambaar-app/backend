import {
  IsAlpha,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GendersEnum, LicenseTypeEnum } from 'generated/prisma';
import { TransporterCompactDto } from 'src/modules/user/dto/transporter-response.dto';
import { Expose } from 'class-transformer';

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

  @IsNotEmpty()
  @IsDateString()
  licenseExpiryDate: Date;

  @IsOptional()
  @IsString()
  profilePictureKey?: string;
}

export class SignupTransporterResponseDto extends TransporterCompactDto {
  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  email?: string;

  @ApiProperty({ enum: GendersEnum })
  @Expose()
  gender: GendersEnum;

  @Expose()
  birthDate?: Date;
}
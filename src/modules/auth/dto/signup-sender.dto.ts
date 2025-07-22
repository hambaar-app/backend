import { ApiProperty } from '@nestjs/swagger';
import {
  IsAlpha,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';
import { GendersEnum } from 'generated/prisma/client';

export class SignupSenderDto {
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

  @IsOptional()
  @IsDateString()
  birthDate?: Date;
}

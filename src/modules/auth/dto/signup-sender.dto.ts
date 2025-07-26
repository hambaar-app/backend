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
  @IsAlpha('fa-IR', { message: 'firstName should be a string only contain persian letters' })
  firstName: string;

  @IsNotEmpty()
  @IsAlpha('fa-IR', { message: 'lastName should be a string only contain persian letters' })
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

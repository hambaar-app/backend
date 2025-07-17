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
  @IsAlpha()
  firstName: string;

  @IsNotEmpty()
  @IsAlpha()
  lastName: string;

  @IsNotEmpty()
  @IsPhoneNumber('IR')
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // @IsNotEmpty()
  // @IsEnum(GendersEnum)
  // gender: GendersEnum;

  @IsOptional()
  @IsDateString()
  birthDate?: Date;
}

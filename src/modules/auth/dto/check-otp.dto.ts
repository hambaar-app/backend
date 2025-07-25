import {
  IsInt,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { UserStatesEnum } from '../types/auth.enums';
import { Transporter } from 'generated/prisma';

export class CheckOtpDto {
  @IsNotEmpty()
  @IsPhoneNumber('IR')
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @Max(99999)
  @Min(10000)
  @IsInt()
  code: number;
}

export class CheckOtpResponseDto {
  isNewUser: boolean;
  userState?: UserStatesEnum;
  transporter?: Transporter;
}
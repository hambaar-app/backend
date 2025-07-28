import {
  IsInt,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { UserStatesEnum } from '../types/auth.enums';
import { Expose, Type } from 'class-transformer';
import { TransporterResponseDto } from 'src/modules/user/dto/transporter-response.dto';
import { StateDto } from './state-response.dto';

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

export class CheckOtpResponseDto extends StateDto {
  @Expose()
  isNewUser: boolean;
}
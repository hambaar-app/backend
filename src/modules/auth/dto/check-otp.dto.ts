import {
  IsInt,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Expose } from 'class-transformer';
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
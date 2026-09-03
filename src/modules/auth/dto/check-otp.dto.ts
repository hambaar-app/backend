import {
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Matches,
  Length,
} from 'class-validator';
import { Expose } from 'class-transformer';
import { StateDto } from './state-response.dto';

export class CheckOtpDto {
  @IsNotEmpty()
  @IsPhoneNumber('IR')
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;
}

export class CheckOtpResponseDto extends StateDto {
  @Expose()
  isNewUser: boolean;
}

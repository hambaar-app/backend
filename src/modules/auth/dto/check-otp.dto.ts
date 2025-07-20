import {
  IsInt,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

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
  authenticated: boolean;
}
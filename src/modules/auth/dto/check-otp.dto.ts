import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AuthRoles } from 'src/common/enums/auth.enum';

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

  @IsOptional()
  @IsEnum(AuthRoles)
  role?: AuthRoles;
}

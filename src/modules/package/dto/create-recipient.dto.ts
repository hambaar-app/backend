import { Type } from 'class-transformer';
import {
  IsAlpha,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  ValidateNested,
} from 'class-validator';
import { CreateAddressDto } from 'src/modules/address/dto/create-address.dto';

export class CreateRecipientDto {
  @IsNotEmpty()
  @IsAlpha('fa-IR', {
    message: 'fullName should be a string only contain persian letters',
  })
  fullName: string;

  @IsNotEmpty()
  @IsPhoneNumber('IR')
  phoneNumber: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;

  @IsOptional()
  @IsBoolean()
  isHighlighted?: boolean;
}

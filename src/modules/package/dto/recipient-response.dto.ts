import { Expose, Type } from 'class-transformer';
import { AddressResponseDto } from 'src/modules/address/dto/address-response.dto';

export class RecipientResponseDto {
  @Expose()
  id: string;

  @Expose()
  fullName: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  @Type(() => AddressResponseDto)
  address: AddressResponseDto;

  @Expose()
  isHighlighted?: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt: Date;
}
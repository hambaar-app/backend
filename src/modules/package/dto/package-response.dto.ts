import { Expose, Type } from 'class-transformer';
import { AddressResponseDto } from 'src/modules/address/dto/address-response.dto';
import { RecipientResponseDto } from './recipient-response.dto';

export class PackageResponseDto {
  @Expose()
  id: string;

  @Expose()
  items: string[];

  @Expose()
  @Type(() => AddressResponseDto)
  originAddress: AddressResponseDto;

  @Expose()
  @Type(() => RecipientResponseDto)
  recipient: RecipientResponseDto;

  @Expose()
  weight: number;

  @Expose()
  dimensions: string;

  @Expose()
  finalPrice: number;

  @Expose()
  packageValue?: number;

  @Expose()
  isFragile: boolean;

  @Expose()
  isPerishable: boolean;

  @Expose()
  description?: string;

  @Expose()
  pickupAtOrigin: boolean;

  @Expose()
  deliveryAtDestination: boolean;

  @Expose()
  preferredPickupTime: [Date, Date];
  
  @Expose()
  preferredDeliveryTime: [Date, Date];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt: Date;
}
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PackageStatusEnum, PaymentStatusEnum } from '../../../../generated/prisma';
import { AddressCompactDto } from '../../address/dto/address-response.dto';
import { RecipientResponseDto } from '../../package/dto/recipient-response.dto';
import { UserCompactDto } from '../../user/dto/user-response.dto';
import { JsonValue } from 'generated/prisma/runtime/library';

class MatchedPackageDto {
  @Expose()
  id: string;

  @Expose()
  code: number;

  @Type(() => UserCompactDto)
  @Expose()
  sender: UserCompactDto;

  @ApiProperty({ enum: PackageStatusEnum })
  @Expose()
  status: PackageStatusEnum;

  @Expose()
  items: string[] | JsonValue | null;

  @Type(() => AddressCompactDto)
  @Expose()
  originAddress: AddressCompactDto;

  @Type(() => RecipientResponseDto)
  @Expose()
  recipient: RecipientResponseDto;

  @Expose()
  weight: number;

  @Expose()
  dimensions: string;

  @Expose()
  packageValue: number;

  @Expose()
  isFragile: boolean;

  @Expose()
  isPerishable: boolean;

  @Expose()
  description: string;

  @Expose()
  pickupAtOrigin: boolean;

  @Expose()
  deliveryAtDestination: boolean;

  @Expose()
  preferredPickupTime: [Date, Date];

  @Expose()
  preferredDeliveryTime: [Date, Date];

  @Expose()
  picturesUrl?: string[];

  @Expose()
  offeredPrice?: number;
}

export class MatchedRequestResponseDto {
  @Type(() => MatchedPackageDto)
  @Expose()
  package: MatchedPackageDto;

  @Expose()
  transporterNotes: string[];

  @Expose()
  pickupTime: Date;

  @Expose()
  deliveryTime: Date;

  @ApiProperty({ enum: PaymentStatusEnum })
  @Expose()
  paymentStatus: PaymentStatusEnum;
}

import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { AddressResponseDto } from '../../address/dto/address-response.dto';
import { RecipientResponseDto } from './recipient-response.dto';
import { PackageStatusEnum, PaymentStatusEnum } from '../../../../generated/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { TransporterInfoResponseDto } from '../../user/dto/transporter-response.dto';
import { PriceBreakdown } from '../../pricing/pricing.types';

export class PackageCompactResponseDto {
  @Expose()
  id: string;

  @Expose()
  items: string[];

  @Expose()
  weight: number;

  @Expose()
  dimensions: string;

  @Expose()
  @Type(() => AddressResponseDto)
  originAddress: AddressResponseDto;

  @Expose()
  @Type(() => RecipientResponseDto)
  recipient: RecipientResponseDto;
  
  @Expose()
  finalPrice: number;

  @ApiProperty({ enum: PackageStatusEnum })
  @Expose()
  status: PackageStatusEnum;

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
  picturesKey: string[];

  @Expose()
  picturesUrl?: string[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt: Date;
}

class MatchedRequestDto {
  @Transform(({ obj }) => ({
    firstName: obj.trip?.transporter?.user?.firstName,
    lastName: obj.trip?.transporter?.user?.lastName,
    gender: obj.trip?.transporter?.user?.gender,
    phoneNumber: obj.trip?.transporter?.user?.phoneNumber,
    rate: obj.trip?.transporter?.rate,
    vehicle: obj.trip?.vehicle
  }))
  @Type(() => TransporterInfoResponseDto)
  @Expose()
  transporter: TransporterInfoResponseDto;

  @Exclude()
  trip: any;

  @Expose()
  trackingCode: string;

  @Expose()
  receiptCode: string;

  @Expose()
  transporterNote?: string;

  @ApiProperty({ enum: PaymentStatusEnum })
  @Expose()
  paymentStatus: PaymentStatusEnum;

  @Expose()
  pickupTime: Date;

  @Expose()
  deliveryTime: Date;
  
  @Expose()
  senderRating?: number | null;

  @Expose()
  senderComment?: string | null;

  @Expose()
  isCompleted: boolean;
}

export class PriceBreakdownDto implements PriceBreakdown {
  @Expose()
  basePrice: number;

  @Expose()
  distanceCost: number;
  
  @Expose()
  weightCost: number;
  
  @Expose()
  specialHandlingCost: number;
  
  @Expose()
  deviationCost?: number;

  @Expose()
  cityPremiumCost: number;
}

export class PackageResponseDto extends PackageCompactResponseDto {
  @Expose()
  @Type(() => PriceBreakdownDto)
  breakdown: PriceBreakdownDto;

  @Expose()
  @Type(() => MatchedRequestDto)
  matchedRequest?: MatchedRequestDto;
}

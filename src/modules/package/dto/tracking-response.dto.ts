import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { PackageStatusEnum } from '../../../../generated/prisma';
import { AddressCompactDto } from '../../address/dto/address-response.dto';
import { PriceBreakdownDto } from './package-response.dto';
import { VehicleCompactResponseDto } from '../../vehicle/dto/vehicle-response.dto';

export class TrackingUpdatesResponseDto {
  @Expose()
  latitude?: string;

  @Expose()
  longitude?: string;

  @Expose()
  city: string;

  @Expose()
  routeName?: string;

  @Expose()
  description?: string;

  @Expose()
  createdAt: Date;
}

class SenderDto {
  @Expose()
  fullName: string;

  @Expose()
  phoneNumber: string;
}

class RecipientDto {
  @Expose()
  fullName: string;

  @Type(() => AddressCompactDto)
  @Expose()
  address: AddressCompactDto;
}

class PackageTrackingDto {
  @Transform(({ obj }) => ({
    fullName: `${obj.sender?.firstName} ${obj.sender?.lastName}`,
    phoneNumber: obj.sender?.phoneNumber
  }))
  @Type(() => SenderDto)
  @Expose()
  sender: SenderDto;

  @Expose()
  code: number;
  
  @Type(() => RecipientDto)
  @Expose()
  recipient: RecipientDto;

  @Expose()
  items: string[];

  @Expose()
  weight: number;

  @Expose()
  dimensions: string;

  @Expose()
  finalPrice: number;

  @Expose()
  breakdown: PriceBreakdownDto;

  @ApiProperty({ enum: PackageStatusEnum })
  @Expose()
  status: PackageStatusEnum;

  @Expose()
  packageValue: number;

  @Expose()
  deliveryAtDestination: boolean;
}

class TransporterDto extends SenderDto {
  @Expose()
  profilePictureUrl: string;

  @Expose()
  rate: number;
  
  // TODO: Add experience
  
  @Type(() => VehicleCompactResponseDto)
  @Expose()
  vehicle: VehicleCompactResponseDto;
}

export class TrackingResponseDto {
  @Type(() => TrackingUpdatesResponseDto)
  @Expose()
  trackingUpdates: TrackingUpdatesResponseDto[];

  @Type(() => PackageTrackingDto)
  @Expose()
  package: PackageTrackingDto;

  @Transform(({ obj }) => ({
    fullName: `${obj.transporter?.firstName} ${obj.transporter?.lastName}`,
    profilePictureUrl: obj.transporter?.profilePictureUrl,
    rate: obj.transporter?.rate ? obj.transporter?.rate : null,
    phoneNumber: obj.transporter?.phoneNumber,
    vehicle: obj.transporter?.vehicle
  }))
  @Type(() => TransporterDto)
  @Expose()
  transporter: TransporterDto;
}
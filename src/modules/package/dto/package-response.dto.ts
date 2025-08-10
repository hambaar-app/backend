import { Expose, Type } from 'class-transformer';
import { AddressResponseDto } from 'src/modules/address/dto/address-response.dto';
import { RecipientResponseDto } from './recipient-response.dto';
import { TripStatusEnum } from 'generated/prisma';
import { ApiProperty } from '@nestjs/swagger';

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
  finalPrice: number;

  @ApiProperty({ enum: TripStatusEnum })
  @Expose()
  status: TripStatusEnum;

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
  @Type((options) => {
    const data = options?.object.data;
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
      return String;
    }
    return PackagePicturesResponse;
  })
  picturesKey: string[] | PackagePicturesResponse;

  @Expose()
  pictures: string[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt: Date;
}

class PackagePicturesResponse {
  @Expose()
  keys: string[];

  @Expose()
  presignedUrls: string[];
}

export class PackageResponseDto extends PackageCompactResponseDto {
  @Expose()
  @Type(() => AddressResponseDto)
  originAddress: AddressResponseDto;

  @Expose()
  @Type(() => RecipientResponseDto)
  recipient: RecipientResponseDto;

  // @Expose()
  // deliveryRequests: any; // TODO
  
  // @Expose()
  // matchedRequest: any; // TODO
}
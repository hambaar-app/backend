import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { LicenseTypeEnum } from '../../../../generated/prisma';
import { VerificationStatusDto } from '../../auth/dto/verification-status.dto';
import { VehicleCompactResponseDto, VehicleResponseDto } from '../../vehicle/dto/vehicle-response.dto';

export class TransporterCompactDto {
  @Expose()
  id: string;

  @Expose()
  nationalId: string;

  @Expose()
  @Type(() => VerificationStatusDto)
  nationalIdStatus: VerificationStatusDto | null;

  @Expose()
  nationalIdDocumentKey?: string | null;

  @Expose()
  nationalIdDocumentUrl?: string | null;

  @Expose()
  licenseNumber: string;

  @Expose()
  @Type(() => VerificationStatusDto)
  licenseStatus: VerificationStatusDto | null;

  @Expose()
  licenseDocumentKey?: string;

  @Expose()
  licenseDocumentUrl?: string;

  @ApiProperty({ enum: LicenseTypeEnum })
  @Expose()
  licenseType: LicenseTypeEnum;

  @Expose()
  licenseExpiryDate: Date;

  @Expose()
  profilePictureKey?: string;

  @Expose()
  profilePictureUrl?: string;

  @Expose()
  bio: string;

  @Expose()
  @Type(() => VerificationStatusDto)
  verificationStatus: VerificationStatusDto | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt: Date;
}

export class TransporterResponseDto extends TransporterCompactDto {
  @Expose()
  @Type(() => VehicleResponseDto)
  vehicles: VehicleResponseDto[];
}

// For package response
export class TransporterInfoResponseDto {
  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  gender: string;

  @Expose()
  phoneNumber: string;
  
  @Expose()
  rate: number;

  @Type(() => VehicleCompactResponseDto)
  @Expose()
  vehicle: VehicleCompactResponseDto;
}
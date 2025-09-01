import { Expose, Transform, Type } from 'class-transformer';
import { VehicleDocumentsDto } from './create-vehicle.dto';
import { VerificationStatusDto } from '../../auth/dto/verification-status.dto';

export class VehicleCompactResponseDto {
  @Expose()
  id: string;

  @Expose()
  vehicleType: string;

  @Expose()
  @Transform(({ obj }) => obj.model?.brand?.name)
  brand?: string;

  @Transform(({ obj }) => obj.model?.name)
  @Expose()
  model?: string;

  @Expose()
  manufactureYear: number;

  @Expose()
  color: string;
}

export class VehicleResponseDto extends VehicleCompactResponseDto {
  @Expose()
  ownerId: string;

  @Expose()
  vin: string;

  @Expose()
  licensePlate: string;

  @Expose()
  barcode: string;

  @Expose()
  greenSheetNumber: string;

  @Expose()
  technicalInspectionDate: Date;

  @Expose()
  technicalInspectionExpiryDate: Date;

  @Expose()
  insuranceNumber: string;

  @Expose()
  insuranceNumberDate?: Date;

  @Expose()
  insuranceExpiryDate?: Date;

  @Expose()
  maxWeightCapacity?: number;

  @Expose()
  @Type(() => VehicleDocumentsDto)
  verificationDocuments?: VehicleDocumentsDto | null;

  @Expose()
  @Type(() => VerificationStatusDto)
  verificationStatus?: VerificationStatusDto | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt: Date;
}

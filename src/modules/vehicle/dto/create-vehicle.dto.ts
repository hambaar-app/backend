import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsAlpha, IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, IsUrl, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { VehicleTypeEnum } from 'generated/prisma';

export class VehicleDocumentsDto {
  @IsNotEmpty()
  @IsUrl()
  greenSheetUrl: string;

  @IsNotEmpty()
  @IsUrl()
  cardUrl: string;

  @IsNotEmpty()
  @IsArray()
  @IsUrl({}, { each: true })
  vehiclePicsUrl: string[];
}

export class CreateVehicleDto {
  @IsNotEmpty()
  @IsString()
  @Length(17, 17)
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/, {
    message: 'VIN must contain only valid characters (A-H, J-N, P, R-Z, 0-9) and no lowercase letters',
  })
  vin: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[۰-۹]{2}[آابپتثجچحخدذرزسشصضطظعغفقکگلمنوهی][۰-۹]{3}-[۰-۹]{2}$/, {
    message:
      `License plate must follow the Iranian format: two Persian digits,
      one Persian letter (from private vehicle set), three Persian digits, hyphen, two Persian digits`,
  })
  licensePlate: string;

  @IsNotEmpty()
  @IsNumberString()
  @Length(9, 9)
  barcode: string;

  @IsNotEmpty()
  @IsNumberString()
  @Length(11, 11)
  greenSheetNumber: string;

  @ApiProperty({ enum: VehicleTypeEnum })
  @IsNotEmpty()
  @IsEnum(VehicleTypeEnum)
  vehicleType: VehicleTypeEnum;

  @IsNotEmpty()
  @IsUUID()
  modelId: string;

  @IsNotEmpty()
  @Max(1405)
  @Min(1380)
  @IsInt()
  manufactureYear: number;

  @IsNotEmpty()
  @IsAlpha('fa-IR')
  color: string;

  @IsNotEmpty()
  @IsDateString()
  technicalInspectionDate: Date;

  @IsNotEmpty()
  @IsDateString()
  technicalInspectionExpiryDate: Date;

  @IsOptional()
  @IsNumberString()
  insuranceNumber?: string;

  @IsOptional()
  @IsDateString()
  insuranceExpiryDate?: Date;

  @IsOptional()
  @IsNumber()
  maxWeightCapacity?: number;

  @IsOptional()
  @Type(() => VehicleDocumentsDto)
  verificationDocuments: VehicleDocumentsDto;
}

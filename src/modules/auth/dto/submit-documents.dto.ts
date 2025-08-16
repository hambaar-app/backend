import { IsNotEmpty } from 'class-validator';
import { IsValidS3Key } from 'src/common/utilities';
import { VehicleDocumentsDto } from 'src/modules/vehicle/dto/create-vehicle.dto';

export class SubmitDocumentsDto extends VehicleDocumentsDto {
  @IsNotEmpty()
  @IsValidS3Key()
  nationalIdDocumentKey: string;

  @IsNotEmpty()
  @IsValidS3Key()
  licenseDocumentKey: string;
}
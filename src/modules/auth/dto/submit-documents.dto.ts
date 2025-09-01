import { IsNotEmpty } from 'class-validator';
import { IsValidS3Key } from '../../../common/utilities';
import { VehicleDocumentsDto } from '../../vehicle/dto/create-vehicle.dto';

export class SubmitDocumentsDto extends VehicleDocumentsDto {
  @IsNotEmpty()
  @IsValidS3Key()
  nationalIdDocumentKey: string;

  @IsNotEmpty()
  @IsValidS3Key()
  licenseDocumentKey: string;
}
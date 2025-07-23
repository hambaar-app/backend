import { IsNotEmpty, IsString } from 'class-validator';
import { VehicleDocumentsDto } from 'src/modules/vehicle/dto/create-vehicle.dto';

export class SubmitDocumentsDto extends VehicleDocumentsDto {
  @IsNotEmpty()
  @IsString()
  nationalIdDocumentKey: string;

  @IsNotEmpty()
  @IsString()
  licenseDocumentKey: string;
}
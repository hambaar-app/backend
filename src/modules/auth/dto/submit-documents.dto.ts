import { IsNotEmpty, IsUrl } from 'class-validator';
import { VehicleDocumentsDto } from 'src/modules/vehicle/dto/create-vehicle.dto';

export class SubmitDocumentsDto extends VehicleDocumentsDto {
  @IsNotEmpty()
  @IsUrl()
  nationalIdDocumentUrl: string;

  @IsNotEmpty()
  @IsUrl()
  licenseDocumentUrl: string;
}
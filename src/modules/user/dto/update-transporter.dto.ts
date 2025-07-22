import { IsNumberString, IsOptional, IsUrl, Length } from 'class-validator';

export class UpdateTransporterDto {
  @IsOptional()
  @Length(10, 10)
  @IsNumberString()
  nationalId?: string;

  @IsOptional()
  @Length(10, 10)
  @IsNumberString()
  driverLicenseNumber?: string;

  @IsOptional()
  @IsUrl()
  profilePictureUrl?: string;

  @IsOptional()
  @IsUrl()
  nationalIdDocumentUrl?: string;
  
  @IsOptional()
  @IsUrl()
  licenseDocumentUrl?: string;
}
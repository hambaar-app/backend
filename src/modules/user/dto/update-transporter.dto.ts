import { IsNumberString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateTransporterDto {
  @IsOptional()
  @Length(10, 10)
  @IsNumberString()
  nationalId?: string;

  @IsOptional()
  @Length(10, 10)
  @IsNumberString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  profilePictureKey?: string;

  @IsOptional()
  @IsString()
  nationalIdDocumentKey?: string;
  
  @IsOptional()
  @IsString()
  licenseDocumentKey?: string;
}
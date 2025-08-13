import { IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateRequestDto {
  @IsNotEmpty()
  @IsUUID()
  packageId: string;

  @IsNotEmpty()
  @IsUUID()
  tripId: string;

  @IsOptional()
  @IsString()
  senderNote?: string;
}

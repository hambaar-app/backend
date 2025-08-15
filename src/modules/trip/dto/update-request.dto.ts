import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

enum RequestStatusEnum {
  Accepted = 'accepted',
  Rejected = 'rejected'
}

export class UpdateRequestDto {
  @IsNotEmpty()
  @IsEnum(RequestStatusEnum)
  status: RequestStatusEnum;

  @IsOptional()
  @IsString()
  transporterNote?: string;
}
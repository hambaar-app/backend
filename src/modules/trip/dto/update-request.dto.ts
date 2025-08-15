import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

enum RequestStatusEnum {
  Accepted = 'accepted',
  Rejected = 'rejected',
}

export class UpdateRequestDto {
  @IsNotEmpty()
  @IsEnum(RequestStatusEnum)
  status: RequestStatusEnum;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  transporterNotes?: string[];
}

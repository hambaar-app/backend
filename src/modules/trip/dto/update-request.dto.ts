import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * NOTE: intentionally a local subset of the Prisma `RequestStatusEnum` —
 * clients may only transition a request to accepted/rejected here.
 */
enum UpdateRequestStatusEnum {
  Accepted = 'accepted',
  Rejected = 'rejected',
}

export class UpdateRequestDto {
  @IsNotEmpty()
  @IsEnum(UpdateRequestStatusEnum)
  status: UpdateRequestStatusEnum;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  transporterNotes?: string[];
}

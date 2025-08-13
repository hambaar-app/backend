import { IsEnum, IsNotEmpty } from 'class-validator';

enum RequestStatusEnum {
  Accepted = 'accepted',
  Rejected = 'rejected'
}

export class UpdateRequestDto {
  @IsNotEmpty()
  @IsEnum(RequestStatusEnum)
  status: RequestStatusEnum;
}
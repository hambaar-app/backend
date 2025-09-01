import { Expose, Type } from 'class-transformer';
import { UserStatesEnum } from '../types/auth.enums';
import { TransporterResponseDto } from '../../user/dto/transporter-response.dto';
import { RolesEnum } from '../../../../generated/prisma';

export class StateDto {  
  @Expose()
  userState: UserStatesEnum;

  @Expose()
  role: RolesEnum;

  @Expose()
  @Type(() => TransporterResponseDto)
  transporter?: TransporterResponseDto;
}
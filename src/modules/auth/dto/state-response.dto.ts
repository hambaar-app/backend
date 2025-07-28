import { Expose, Type } from 'class-transformer';
import { UserStatesEnum } from '../types/auth.enums';
import { TransporterResponseDto } from 'src/modules/user/dto/transporter-response.dto';

export class StateDto {  
  @Expose()
  userState: UserStatesEnum;

  @Expose()
  @Type(() => TransporterResponseDto)
  transporter?: TransporterResponseDto;
}
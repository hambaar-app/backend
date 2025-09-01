import { PartialType } from '@nestjs/swagger';
import { SignupSenderDto } from '../../auth/dto/signup-sender.dto';

export class UpdateUserDto extends PartialType(SignupSenderDto) {}
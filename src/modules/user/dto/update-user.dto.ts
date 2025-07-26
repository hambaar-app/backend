import { PartialType } from '@nestjs/swagger';
import { SignupSenderDto } from 'src/modules/auth/dto/signup-sender.dto';

export class UpdateUserDto extends PartialType(SignupSenderDto) {}
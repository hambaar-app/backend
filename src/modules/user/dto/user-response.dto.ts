import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { GendersEnum } from '../../../../generated/prisma';
import { TransporterCompactDto } from './transporter-response.dto';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  email?: string;

  @ApiProperty({ enum: GendersEnum })
  @Expose()
  gender: GendersEnum;

  @Expose()
  birthDate?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt: Date;
}

export class ProfileResponseDto extends UserResponseDto {
  @Expose()
  @Type(() => TransporterCompactDto)
  transporter: TransporterCompactDto;
}
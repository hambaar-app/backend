import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { GendersEnum } from '../../../../generated/prisma';
import { TransporterCompactDto } from './transporter-response.dto';

export class UserCompactDto {
  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  phoneNumber: string;

  @ApiProperty({ enum: GendersEnum })
  @Expose()
  gender: GendersEnum;
}

export class UserResponseDto extends UserCompactDto {
  @Expose()
  id: string;

  @Expose()
  email?: string;

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
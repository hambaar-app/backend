import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { GendersEnum } from 'generated/prisma';

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
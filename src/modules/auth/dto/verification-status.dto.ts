import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { VerificationStatusEnum } from 'generated/prisma';

export class VerificationStatusDto {
  @ApiProperty({ enum: VerificationStatusEnum })
  @Expose()
  status: VerificationStatusEnum;

  @Expose()
  description?: string | null;

  @Expose()
  verifiedAt?: Date | null;
}
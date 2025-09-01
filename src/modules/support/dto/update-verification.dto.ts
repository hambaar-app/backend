import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VerificationStatusEnum } from '../../../../generated/prisma';

export class UpdateVerificationDto {
  @ApiProperty({
    enum: VerificationStatusEnum
  })
  @IsNotEmpty()
  @IsEnum(VerificationStatusEnum)
  status: VerificationStatusEnum;

  @IsOptional()
  @IsString()
  description?: string;
}
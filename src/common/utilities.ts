import { BadRequestException, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma } from 'generated/prisma';

export const generateOTP = () => {
  return crypto.randomInt(11111, 99999);
};

export const formatPrismaError = (error: Error): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target =
          (error.meta?.target as string[])?.join(', ') || 'unknown field';
        const model = error.meta?.modelName || 'unknown model';
        throw new ConflictException(`A record with this ${target} already exists in ${model}.`);
      }
      default:
        throw new BadRequestException(`Database error (${error.code}): ${error.message}`);
    }
  }
  throw new BadRequestException('An unexpected database error occurred.');
};

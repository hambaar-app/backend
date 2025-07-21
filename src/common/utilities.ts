import * as crypto from 'crypto';
import { Prisma } from 'generated/prisma';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export const generateOTP = () => {
  return crypto.randomInt(11111, 99999);
};


export const formatPrismaError = (error: Error): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(', ')
      : 'unknown field';
    const model = (error.meta?.modelName as string) || 'unknown model';

    switch (error.code) {
      case 'P2000':
        throw new BadRequestException(
          `Value too long for field ${target} in ${model}.`
        );
      case 'P2002':
        throw new ConflictException(
          `A ${model} with this ${target} already exists.`
        );
      case 'P2003':
        throw new BadRequestException(
          `Foreign key constraint failed on ${target} in ${model}.`
        );
      case 'P2025':
        throw new NotFoundException(
          `Record not found in ${model} for the provided ${target}.`
        );
      default:
        throw new BadRequestException(
          `Database error (${error.code}): ${error.message}`
        );
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new BadRequestException('Invalid input data provided.');
  }
  throw new BadRequestException('An unexpected database error occurred.');
};
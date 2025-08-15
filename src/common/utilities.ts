import * as crypto from 'crypto';
import { Prisma } from 'generated/prisma';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isAfter, isValid } from 'date-fns';

export const generateCode = () => {
  return crypto.randomInt(11111, 99999);
};

export const formatPrismaError = (error: Error): never => {
  if (process.env.NODE_ENV === 'development')
    console.error(error);

  if (error instanceof HttpException) {
    throw error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(', ')
      : error.meta?.field_name || 'unknown field';
    const model = (error.meta?.modelName as string) || 'unknown model';
    const cause = (error.meta?.cause as string) || 'Operation failed';

    switch (error.code) {
      case 'P2000':
        throw new BadRequestException(
          `Value too long for field ${target} in ${model}.`,
        );
      case 'P2002':
        throw new ConflictException(
          `A ${model} with the ${target} already exists. Please use a different value.`,
        );
      case 'P2003':
        const constraintName = error.meta?.constraint as string;
        let relationshipMessage = '';
        
        if (constraintName?.includes('_fkey')) {
          relationshipMessage = target !== 'unknown field' 
            ? `The specified '${target}' does not exist or is invalid.`
            : `Referenced record does not exist.`;
        }
        
        throw new BadRequestException(
          `Foreign key constraint violation in ${model}. ${relationshipMessage}`
        );
      case 'P2004':
        throw new BadRequestException(
          `Constraint violation on ${target} in ${model}: ${cause}.`,
        );
      case 'P2025':
        throw new NotFoundException(
          `No ${model} found${target !== 'unknown field' ? ` with ${target}` : ''}. ${cause}`,
        );
      case 'P2016':
        throw new BadRequestException(
          `Query interpretation error in ${model} for ${target}. ${cause}`,
        );
      default:
        throw new InternalServerErrorException(
          `Database error (${error.code}): ${cause || error.message}`,
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    const message =
      error.message.split('\n').pop()?.trim() || 'Invalid input data provided.';
    throw new BadRequestException(`Validation failed: ${message}`);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    throw new InternalServerErrorException(
      `Unknown database error: ${error.message}`,
    );
  }

  throw new InternalServerErrorException(
    `An unexpected error occurred: ${error.message || 'Unknown error'}`,
  );
};

@ValidatorConstraint({ name: 'isValidDateTimeTuple', async: false })
export class IsValidDateTimeTupleConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments): boolean {
    if (!Array.isArray(value) || value.length !== 2) {
      return false;
    }

    const [start, end] = value;

    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);

    if (!isValid(startDate) || !isValid(endDate)) {
      return false;
    }

    return isAfter(endDate, startDate);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a tuple of two valid DateTime values where the second is after the first (e.g., ["2025-07-29T10:00:00.000Z", "2025-07-29T12:00:00.000Z"]).`;
  }
}

@ValidatorConstraint({ name: 'isDeliveryAfterPickup', async: false })
export class IsDeliveryAfterPickupConstraint
  implements ValidatorConstraintInterface
{
  validate(preferredDeliveryTime: any, args: ValidationArguments): boolean {
    const { object } = args;
    const preferredPickupTime = (object as any).preferredPickupTime;

    if (
      !Array.isArray(preferredPickupTime) ||
      preferredPickupTime.length !== 2 ||
      !Array.isArray(preferredDeliveryTime) ||
      preferredDeliveryTime.length !== 2
    ) {
      return false;
    }

    const [, pickupEnd] = preferredPickupTime;
    const [deliveryStart] = preferredDeliveryTime;

    const pickupEndDate =
      pickupEnd instanceof Date ? pickupEnd : new Date(pickupEnd);
    const deliveryStartDate =
      deliveryStart instanceof Date ? deliveryStart : new Date(deliveryStart);

    if (!isValid(pickupEndDate) || !isValid(deliveryStartDate)) {
      return false;
    }

    return isAfter(deliveryStartDate, pickupEndDate);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} start time must be after preferredPickupTime end time.`;
  }
}

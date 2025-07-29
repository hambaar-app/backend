import * as crypto from 'crypto';
import { Prisma } from 'generated/prisma';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { isDate, isAfter, isValid } from 'date-fns';

export const generateOTP = () => {
  return crypto.randomInt(11111, 99999);
};

export const formatPrismaError = (error: Error): never => {
  if (process.env.NODE_ENV === 'development') console.log(error);

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
          `Record not found in ${model} ${target ? `for the provided ${target}` : ''}.`
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

@ValidatorConstraint({ name: 'isValidDateTimeTuple', async: false })
export class IsValidDateTimeTupleConstraint implements ValidatorConstraintInterface {
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
export class IsDeliveryAfterPickupConstraint implements ValidatorConstraintInterface {
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

    const pickupEndDate = pickupEnd instanceof Date ? pickupEnd : new Date(pickupEnd);
    const deliveryStartDate = deliveryStart instanceof Date ? deliveryStart : new Date(deliveryStart);

    if (!isValid(pickupEndDate) || !isValid(deliveryStartDate)) {
      return false;
    }

    return isAfter(deliveryStartDate, pickupEndDate);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} start time must be after preferredPickupTime end time.`;
  }
}
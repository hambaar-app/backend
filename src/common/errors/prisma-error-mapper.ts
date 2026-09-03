import { Prisma } from '../../../generated/prisma';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export interface PrismaErrorResult {
  status: number;
  message: string;
}

/**
 * Pure mapping of Prisma errors to HTTP status/messages. Behavior-preserving
 * with the legacy `formatPrismaError` in utilities.ts — only the control flow
 * (throw vs. return) changes.
 */
export function mapPrismaError(error: unknown): PrismaErrorResult {
  if (error instanceof HttpException) {
    return {
      status: error.getStatus(),
      message: error.message,
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(', ')
      : (error.meta?.field_name as string) || 'unknown field';
    const model = (error.meta?.modelName as string) || 'unknown model';
    const cause = (error.meta?.cause as string) || 'Operation failed';

    switch (error.code) {
      case 'P2000':
        return {
          status: 400,
          message: `Value too long for field ${target} in ${model}.`,
        };
      case 'P2002':
        return {
          status: 409,
          message: `A ${model} with the ${target} already exists. Please use a different value.`,
        };
      case 'P2003': {
        const constraintName = error.meta?.constraint as string;
        let relationshipMessage = '';

        if (constraintName?.includes('_fkey')) {
          relationshipMessage =
            target !== 'unknown field'
              ? `The specified '${target}' does not exist or is invalid.`
              : `Referenced record does not exist.`;
        }

        return {
          status: 400,
          message: `Foreign key constraint violation in ${model}. ${relationshipMessage}`,
        };
      }
      case 'P2004':
        return {
          status: 400,
          message: `Constraint violation on ${target} in ${model}: ${cause}.`,
        };
      case 'P2025':
        return {
          status: 404,
          message: `No ${model} found${target !== 'unknown field' ? ` with ${target}` : ''}. ${cause}`,
        };
      case 'P2016':
        return {
          status: 400,
          message: `Query interpretation error in ${model} for ${target}. ${cause}`,
        };
      default:
        return {
          status: 500,
          message: `Database error (${error.code}): ${cause || error.message}`,
        };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    const message =
      error.message.split('\n').pop()?.trim() || 'Invalid input data provided.';
    return {
      status: 400,
      message: `Validation failed: ${message}`,
    };
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      status: 500,
      message: `Unknown database error: ${error.message}`,
    };
  }

  const message =
    error instanceof Error ? error.message : 'Unknown error';
  return {
    status: 500,
    message: `An unexpected error occurred: ${message || 'Unknown error'}`,
  };
}

import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthMessages } from './enums/messages.enum';

export function ApiQueryPagination() {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      type: Number,
      required: false,
      description: 'Page number for paginated relations (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      type: Number,
      required: false,
      description: 'Number of titles per page (default: 10)',
    }),
  );
}

export function AuthResponses() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Bad Request - Invalid input data (Database error)',
      schema: {
        example: {
          statusCode: 400,
          message: 'Validation failed: Invalid input data provided.',
          error: 'Bad Request',
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Missing Temporary/Progress/Access token',
      schema: {
        example: {
          statusCode: 401,
          message:
            'Temporary/Progress/Access token is required but was not provided.',
          error: 'Unauthorized',
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Forbidden - Access denied',
      schema: {
        example: {
          statusCode: 403,
          message: AuthMessages.AccessDenied,
          error: 'Forbidden',
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal Server Error',
      schema: {
        example: {
          statusCode: 500,
          message: 'An unexpected error occurred',
          error: 'Internal Server Error',
        },
      },
    }),
  );
}

export function ValidationResponses() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Validation Error - Invalid input data format',
      schema: {
        example: {
          statusCode: 400,
          message: [
            'email must be a valid email address',
            'password must be at least 8 characters long',
          ],
          error: 'Bad Request',
        },
      },
    }),
  );
}

export function CrudResponses() {
  return applyDecorators(
    ApiNotFoundResponse({
      description: 'Not Found - Requested resource does not exist',
      schema: {
        example: {
          statusCode: 404,
          message: 'No record found with the specified criteria',
          error: 'Not Found',
        },
      },
    }),
    ApiConflictResponse({
      description:
        'Conflict (For POST and PATCH) - Resource already exists (duplicate constraint violation)',
      schema: {
        example: {
          statusCode: 409,
          message: [
            {
              field: 'username',
              value: 'johndoe',
              message:
                'A User with the username already exists. Please use a different value.',
            },
          ],
          error: 'Conflict',
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal Server Error - Database or server error',
      schema: {
        example: {
          statusCode: 500,
          message: 'Database error: An unexpected error occurred',
          error: 'Internal Server Error',
        },
      },
    }),
  );
}

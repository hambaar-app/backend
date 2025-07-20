import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsException extends HttpException {
  constructor(
    message: string = 'Too many requests',
    description?: string
  ) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        error: 'Too Many Requests',
        description,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
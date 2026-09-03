import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { mapPrismaError } from '../errors/prisma-error-mapper';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).id as string | undefined;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : mapPrismaError(exception).status;

    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        error = exception.name;
      } else {
        const body = res as Record<string, any>;
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : (body.message ?? exception.message);
        error = body.error ?? exception.name;
      }
    } else {
      const mapped = mapPrismaError(exception);
      message = mapped.message;
      error = 'Internal Server Error';
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} — ${message}`,
        exception instanceof Error ? exception.stack : undefined,
        { requestId },
      );
    }

    const body: Record<string, any> = {
      statusCode: status,
      message,
      error,
    };

    if (requestId) {
      body.requestId = requestId;
    }

    response.status(status).json(body);
  }
}

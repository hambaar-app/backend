import { AllExceptionsFilter } from './all-exceptions.filter';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';

const buildHost = (request: any = {}) => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getData: () => ({}) }),
    switchToWs: () => ({ getData: () => ({}) }),
    getType: () => 'http' as any,
  } as any;
};

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the HttpException envelope unchanged', () => {
    const host = buildHost();
    const res = host.switchToHttp().getResponse();
    const json = res.json as jest.Mock;

    filter.catch(new ConflictException('already exists'), host);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'already exists',
      }),
    );
  });

  it('flattens array validation messages', () => {
    const host = buildHost();
    const res = host.switchToHttp().getResponse();
    const json = res.json as jest.Mock;

    filter.catch(
      new BadRequestException({ message: ['field is required', 'field2 bad'], error: 'Bad Request' }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'field is required, field2 bad',
      }),
    );
  });

  it('maps a Prisma P2025 error to 404', () => {
    const error = new Prisma.PrismaClientKnownRequestError('not found', {
      clientVersion: '6.15.0',
      code: 'P2025',
    } as any);
    (error as any).meta = { modelName: 'User', field_name: 'id', cause: 'No record' };
    const host = buildHost();
    const res = host.switchToHttp().getResponse();
    const json = res.json as jest.Mock;

    filter.catch(error, host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it('returns 500 for an unknown error', () => {
    const host = buildHost();
    const res = host.switchToHttp().getResponse();
    const json = res.json as jest.Mock;

    filter.catch(new Error('boom'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
      }),
    );
  });

  it('includes requestId when present on the request', () => {
    const host = buildHost({ id: 'req-123' });
    const res = host.switchToHttp().getResponse();
    const json = res.json as jest.Mock;

    filter.catch(new BadRequestException('bad'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'req-123' }),
    );
  });
});

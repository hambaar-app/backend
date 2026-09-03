import { mapPrismaError } from './prisma-error-mapper';
import { Prisma } from '../../../generated/prisma';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';

const makeKnownError = (code: string, meta: Record<string, any> = {}) => {
  const error = new Prisma.PrismaClientKnownRequestError('prisma error', {
    clientVersion: '6.15.0',
    code,
    meta,
  } as any);
  return error;
};

describe('mapPrismaError', () => {
  it('passes through HttpException unchanged', () => {
    const httpError = new ConflictException('already exists');
    const result = mapPrismaError(httpError);
    expect(result.status).toBe(409);
    expect(result.message).toBe('already exists');
  });

  it('maps P2000 to 400 (value too long)', () => {
    const result = mapPrismaError(
      makeKnownError('P2000', { target: ['email'], field_name: 'email', modelName: 'User' }),
    );
    expect(result.status).toBe(400);
    expect(result.message).toContain('Value too long');
    expect(result.message).toContain('email');
  });

  it('maps P2000 with array target joined', () => {
    const result = mapPrismaError(
      makeKnownError('P2000', { target: ['a', 'b'], field_name: 'a', modelName: 'User' }),
    );
    expect(result.message).toContain('a, b');
  });

  it('maps P2002 to 409 (unique constraint)', () => {
    const result = mapPrismaError(
      makeKnownError('P2002', { target: ['phoneNumber'], field_name: 'phoneNumber', modelName: 'User' }),
    );
    expect(result.status).toBe(409);
    expect(result.message).toContain('with the phoneNumber already exists');
  });

  it('maps P2003 to 400 (foreign key)', () => {
    const result = mapPrismaError(
      makeKnownError('P2003', {
        constraint: 'Package_senderId_fkey',
        target: 'senderId',
        field_name: 'senderId',
        modelName: 'Package',
      }),
    );
    expect(result.status).toBe(400);
    expect(result.message).toContain("The specified 'senderId' does not exist");
  });

  it('maps P2003 without _fkey constraint', () => {
    const result = mapPrismaError(
      makeKnownError('P2003', { target: 'field', field_name: 'field', modelName: 'Model' }),
    );
    expect(result.status).toBe(400);
    expect(result.message).toContain('Foreign key constraint violation');
  });

  it('maps P2004 to 400 (constraint violation)', () => {
    const result = mapPrismaError(
      makeKnownError('P2004', {
        target: 'field',
        field_name: 'field',
        modelName: 'Model',
        cause: 'failed',
      }),
    );
    expect(result.status).toBe(400);
    expect(result.message).toContain('Constraint violation');
  });

  it('maps P2025 to 404 (not found)', () => {
    const result = mapPrismaError(
      makeKnownError('P2025', {
        target: 'id',
        field_name: 'id',
        modelName: 'User',
        cause: 'No record',
      }),
    );
    expect(result.status).toBe(404);
    expect(result.message).toContain('No User found');
    expect(result.message).toContain('with id');
  });

  it('maps P2025 without target to 404', () => {
    const result = mapPrismaError(
      makeKnownError('P2025', { modelName: 'User', cause: 'No record' }),
    );
    expect(result.status).toBe(404);
    expect(result.message).toBe('No User found. No record');
  });

  it('maps P2016 to 400 (query interpretation)', () => {
    const result = mapPrismaError(
      makeKnownError('P2016', {
        target: 'field',
        field_name: 'field',
        modelName: 'Model',
        cause: 'bad query',
      }),
    );
    expect(result.status).toBe(400);
    expect(result.message).toContain('Query interpretation error');
  });

  it('maps unknown Prisma code to 500', () => {
    const result = mapPrismaError(
      makeKnownError('P9999', { modelName: 'Model', cause: 'oops' }),
    );
    expect(result.status).toBe(500);
    expect(result.message).toContain('Database error (P9999)');
  });

  it('maps PrismaClientValidationError to 400', () => {
    const error = new Prisma.PrismaClientValidationError(
      'Unknown argument\nInvalid input data',
      { clientVersion: '6.15.0' },
    );
    const result = mapPrismaError(error);
    expect(result.status).toBe(400);
    expect(result.message).toContain('Invalid input data');
  });

  it('maps PrismaClientUnknownRequestError to 500', () => {
    const error = new Prisma.PrismaClientUnknownRequestError('boom', {
      clientVersion: '6.15.0',
    });
    const result = mapPrismaError(error);
    expect(result.status).toBe(500);
    expect(result.message).toContain('Unknown database error');
  });

  it('maps a generic Error to 500', () => {
    const result = mapPrismaError(new Error('something broke'));
    expect(result.status).toBe(500);
    expect(result.message).toContain('something broke');
  });

  it('maps a non-error to 500', () => {
    const result = mapPrismaError('weird');
    expect(result.status).toBe(500);
    expect(result.message).toContain('Unknown error');
  });
});

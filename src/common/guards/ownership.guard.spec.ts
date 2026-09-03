import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { OwnershipGuard } from './ownership.guard';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { RolesEnum } from '../../../generated/prisma';
import { AuthMessages } from '../enums/messages.enum';

const buildContext = (handler: any = () => {}, request: any = {}) =>
  ({
    getType: () => 'http',
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as any;

describe('OwnershipGuard', () => {
  let guard: OwnershipGuard;
  let reflector: DeepMockProxy<Reflector>;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(() => {
    reflector = mockDeep<Reflector>();
    prisma = mockDeep<PrismaService>();
    guard = new OwnershipGuard(reflector, prisma);
  });

  it('returns true when no ownership config is set', async () => {
    reflector.get.mockReturnValue(undefined);
    const result = await guard.canActivate(buildContext());
    expect(result).toBe(true);
  });

  it('throws ForbiddenException when user is not authenticated', async () => {
    reflector.get.mockReturnValue({ entity: 'vehicle' });
    await expect(
      guard.canActivate(buildContext(() => {}, { user: undefined, params: {} })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns true for admin users', async () => {
    reflector.get.mockReturnValue({ entity: 'vehicle' });
    const result = await guard.canActivate(
      buildContext(() => {}, {
        user: { id: 'admin-1', role: RolesEnum.admin },
        params: { id: 'v1' },
      }),
    );
    expect(result).toBe(true);
  });

  it('throws BadRequestException when :id param is missing', async () => {
    reflector.get.mockReturnValue({ entity: 'vehicle' });
    await expect(
      guard.canActivate(
        buildContext(() => {}, {
          user: { id: 'u1', role: RolesEnum.sender },
          params: {},
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws EntityAccessDenied when record not found', async () => {
    reflector.get.mockReturnValue({ entity: 'vehicle' });
    (prisma as any).vehicle = { findFirst: jest.fn().mockResolvedValue(null) };

    await expect(
      guard.canActivate(
        buildContext(() => {}, {
          user: { id: 'u1', role: RolesEnum.sender },
          params: { id: 'v1' },
        }),
      ),
    ).rejects.toThrow(/Access Denied/);
  });

  it('returns true when record is owned', async () => {
    reflector.get.mockReturnValue({ entity: 'vehicle' });
    (prisma as any).vehicle = { findFirst: jest.fn().mockResolvedValue({ id: 'v1' }) };

    const result = await guard.canActivate(
      buildContext(() => {}, {
        user: { id: 'u1', role: RolesEnum.sender },
        params: { id: 'v1' },
      }),
    );
    expect(result).toBe(true);
  });

  it('throws 403 fallback on Prisma failure', async () => {
    reflector.get.mockReturnValue({ entity: 'vehicle' });
    (prisma as any).vehicle = { findFirst: jest.fn().mockRejectedValue(new Error('db down')) };

    await expect(
      guard.canActivate(
        buildContext(() => {}, {
          user: { id: 'u1', role: RolesEnum.sender },
          params: { id: 'v1' },
        }),
      ),
    ).rejects.toThrow(AuthMessages.AccessDenied);
  });

  it('throws error for invalid entity name', async () => {
    reflector.get.mockReturnValue({ entity: 'nonexistent' });
    await expect(
      guard.canActivate(
        buildContext(() => {}, {
          user: { id: 'u1', role: RolesEnum.sender },
          params: { id: 'x1' },
        }),
      ),
    ).rejects.toThrow();
  });
});

import { GendersEnum, RolesEnum, User } from '../../generated/prisma';

/**
 * Shared user fixture. Usage:
 *   const user = createMockUser();
 *   const admin = createMockUser({ role: RolesEnum.admin, id: 'user-2' });
 */
export const createMockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    firstName: 'علی',
    lastName: 'رضایی',
    gender: GendersEnum.male,
    phoneNumber: '09121112233',
    phoneVerifiedAt: new Date('2025-01-01T10:00:00.000Z'),
    email: null,
    emailVerifiedAt: null,
    birthDate: null,
    role: RolesEnum.sender,
    isActive: true,
    transporter: null,
    packages: [],
    addresses: [],
    wallet: null,
    notifications: [],
    createdAt: new Date('2025-01-01T10:00:00.000Z'),
    updatedAt: new Date('2025-01-01T10:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }) as User;

export const mockUser = createMockUser();
export const mockTransporterUser = createMockUser({ role: RolesEnum.transporter });

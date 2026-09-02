import { SessionData } from 'express-session';

/**
 * Minimal express-session fixture matching the app's SessionData augmentation
 * (see src/modules/auth/types for the augmented fields).
 */
export const createMockSession = (overrides: Partial<SessionData> = {}): SessionData =>
  ({
    cookie: {
      originalMaxAge: 15 * 24 * 3600 * 1000,
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
    },
    phoneNumber: '09121112233',
    userId: '11111111-1111-4111-8111-111111111111',
    accessToken: '',
    lastAccessed: new Date('2025-01-01T10:00:00.000Z'),
    packages: [],
    ...overrides,
  }) as unknown as SessionData;

export const mockSession = createMockSession();

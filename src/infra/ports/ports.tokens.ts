/**
 * Injection tokens for infrastructure ports (Phase 5 Task 1).
 *
 * Bound in the owning modules (`S3Module`/`SmsModule`/`MapModule`) so unit
 * tests can `overrideProvider` with fakes.
 */
export const PORTS = {
  STORAGE: 'PORTS.STORAGE',
  SMS: 'PORTS.SMS',
  MAPS: 'PORTS.MAPS',
} as const;

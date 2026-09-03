import * as crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Legacy 5-digit OTP generator (biased range, not zero-padded).
 *
 * @deprecated Use generateSecureOtp() instead. Kept only because the trip
 * delivery code (trip.service.ts) still relies on this range/format;
 * migrated in Phase 4.
 */
export function generateCode(): number {
  return crypto.randomInt(11_111, 99_999);
}

/**
 * Generate a cryptographically secure 6-digit OTP code, zero-padded.
 * Uniform distribution over the full 000000–999999 space.
 *
 * BREAKING: previously this was a biased 5-digit number (11111–99998).
 * Now returns a zero-padded 6-digit string.
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Legacy unique code generator. Format: timestamp + random int.
 *
 * NOTE: uniqueness is NOT guaranteed — the timestamp prefix makes this
 * deterministic within the same millisecond. For new code, prefer
 * generateTripCode() / generateTrackingCode() with a DB unique column
 * constraint and P2002 retry (Phase 4 TransactionRunner).
 */
export function generateUniqueCode(): string {
  return Date.now().toString() + crypto.randomInt(1_111_111, 9_999_999);
}

/**
 * Generate a crypto-random 8-character base32 code.
 * Uniqueness is enforced by the database unique column (P2002 retry via
 * TransactionRunner in Phase 4) — the code itself carries no timestamp.
 */
export function generateTripCode(): string {
  return generateBase32Code(8);
}

/**
 * Generate a crypto-random 8-character base32 code.
 * Uniqueness is enforced by the database unique column (P2002 retry via
 * TransactionRunner in Phase 4) — the code itself carries no timestamp.
 */
export function generateTrackingCode(): string {
  return generateBase32Code(8);
}

function generateBase32Code(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE32_ALPHABET[crypto.randomInt(0, BASE32_ALPHABET.length)];
  }
  return result;
}

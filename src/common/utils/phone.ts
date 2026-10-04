/**
 * Phone-number masking for public responses (Phase 4 Task 5, S-8).
 *
 * Keeps the country prefix and the last three digits so UIs can still
 * display a recognizable hint without exposing PII:
 * `+989121112233` → `+98•••••233`.
 */
const VISIBLE_PREFIX_LENGTH = 3;
const VISIBLE_SUFFIX_LENGTH = 3;
const MASK = '•••••';

export function maskPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || phoneNumber.length <= VISIBLE_PREFIX_LENGTH) {
    return MASK;
  }
  if (phoneNumber.length <= VISIBLE_PREFIX_LENGTH + VISIBLE_SUFFIX_LENGTH) {
    return `${phoneNumber.slice(0, VISIBLE_PREFIX_LENGTH)}${MASK}`;
  }
  return `${phoneNumber.slice(0, VISIBLE_PREFIX_LENGTH)}${MASK}${phoneNumber.slice(-VISIBLE_SUFFIX_LENGTH)}`;
}

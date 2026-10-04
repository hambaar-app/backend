/**
 * Single money-formatting helper (Phase 5 Task 3).
 *
 * BigInt amounts stay `bigint` internally (Prisma `BigInt` columns); every
 * public serialization goes through here so JSON responses carry decimal
 * strings. Negative and zero values pass through untouched.
 */
export function formatMoney(amount: bigint): string;
export function formatMoney(
  amount: bigint | null | undefined,
): string | undefined;
export function formatMoney(
  amount: bigint | null | undefined,
): string | undefined {
  return amount?.toString();
}

/**
 * Pure matching score calculator (Phase 4 Task 3).
 *
 * Extracted verbatim from `MatchingService.calculateMatchingScore` so the
 * orchestration service can delegate without behavior drift.
 *
 * Note: lower score is better (MVP rules).
 */
export const MATCHING_OFF_CORRIDOR_PENALTY = 100_000;
export const MATCHING_CLOSE_POINT_THRESHOLD_M = 1000;
export const MATCHING_CLOSE_POINT_BONUS = 500;

export class MatchingScorer {
  calculateMatchingScore(
    originDistance: number,
    destinationDistance: number,
    isOnCorridor: boolean,
  ): number {
    // Base score: mean distance to route.
    let score = (originDistance + destinationDistance) / 2;

    // Penalty for packages not on corridor (unreachable in practice today
    // because the analyzer filters first — kept for parity + unit coverage).
    if (!isOnCorridor) {
      score += MATCHING_OFF_CORRIDOR_PENALTY;
    }

    // Bonus for trips that start/end very close to package points.
    if (originDistance < MATCHING_CLOSE_POINT_THRESHOLD_M)
      score -= MATCHING_CLOSE_POINT_BONUS;
    if (destinationDistance < MATCHING_CLOSE_POINT_THRESHOLD_M)
      score -= MATCHING_CLOSE_POINT_BONUS;

    // TODO: picks up time-based scoring (preferred times) — MVP gap.
    // TODO: picks up transporter rating scoring — MVP gap.

    return Math.max(0, score); // Ensure non-negative score
  }
}

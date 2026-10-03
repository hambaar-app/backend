import { Prisma, TripStatusEnum } from '../../../../generated/prisma';

/**
 * Pure pre-filter query builder (Phase 4 Task 3).
 *
 * Extracted verbatim from `MatchingService.getPreFilteredTrips` so the where
 * clause can be unit-tested without Prisma.
 */
export interface TripCandidateQueryInput {
  weight?: number | null;
  lastCheckMatching?: Date;
}

export function buildTripCandidateWhere(
  input: TripCandidateQueryInput,
): Prisma.TripWhereInput {
  const whereClause: Prisma.TripWhereInput = {
    isActive: true,
    status: TripStatusEnum.scheduled,
  };

  // Just check new trips after lastCheckMatching
  if (input.lastCheckMatching) {
    whereClause.updatedAt = {
      gte: input.lastCheckMatching,
    };
  }

  // Filter by weight capacity
  if (input.weight) {
    whereClause.OR = [
      { maxPackageWeightGr: { gte: input.weight } },
      { maxPackageWeightGr: null },
    ];
  }

  // TODO: picks up departure-time filtering — MVP gap, no behavior change.

  return whereClause;
}

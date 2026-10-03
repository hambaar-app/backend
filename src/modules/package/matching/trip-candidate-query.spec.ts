import { TripStatusEnum } from '../../../../generated/prisma';
import { buildTripCandidateWhere } from './trip-candidate-query';

describe('buildTripCandidateWhere', () => {
  describe('base filter', () => {
    it('should return only active scheduled filter when no input', () => {
      expect(buildTripCandidateWhere({})).toEqual({
        isActive: true,
        status: TripStatusEnum.scheduled,
      });
    });

    it('should not filter by weight when weight is null', () => {
      expect(buildTripCandidateWhere({ weight: null })).toEqual({
        isActive: true,
        status: TripStatusEnum.scheduled,
      });
    });

    it('should not filter by weight when weight is zero', () => {
      expect(buildTripCandidateWhere({ weight: 0 })).toEqual({
        isActive: true,
        status: TripStatusEnum.scheduled,
      });
    });
  });

  describe('lastCheckMatching', () => {
    it('should filter by updatedAt when lastCheckMatching is provided', () => {
      const lastCheck = new Date('2024-01-15T10:00:00Z');

      expect(buildTripCandidateWhere({ lastCheckMatching: lastCheck })).toEqual(
        {
          isActive: true,
          status: TripStatusEnum.scheduled,
          updatedAt: { gte: lastCheck },
        },
      );
    });
  });

  describe('weight capacity', () => {
    it('should filter by weight capacity with OR-null when weight is present', () => {
      expect(buildTripCandidateWhere({ weight: 5000 })).toEqual({
        isActive: true,
        status: TripStatusEnum.scheduled,
        OR: [
          { maxPackageWeightGr: { gte: 5000 } },
          { maxPackageWeightGr: null },
        ],
      });
    });

    it('should combine lastCheckMatching and weight filters', () => {
      const lastCheck = new Date('2024-01-15T10:00:00Z');

      expect(
        buildTripCandidateWhere({ weight: 2000, lastCheckMatching: lastCheck }),
      ).toEqual({
        isActive: true,
        status: TripStatusEnum.scheduled,
        updatedAt: { gte: lastCheck },
        OR: [
          { maxPackageWeightGr: { gte: 2000 } },
          { maxPackageWeightGr: null },
        ],
      });
    });
  });
});

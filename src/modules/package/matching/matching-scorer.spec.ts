import { MatchingScorer } from './matching-scorer';

describe('MatchingScorer', () => {
  const scorer = new MatchingScorer();

  describe('calculateMatchingScore', () => {
    it.each([
      // [originDistance, destinationDistance, isOnCorridor, expected]
      [800, 600, true, 0],
      [500, 800, true, 0],
      [500, 500, true, 0],
      [100, 100, true, 0],
      [2000, 2000, true, 2000],
      [1500, 1500, true, 1500],
      [5000, 1000, true, 3000],
      [800, 600, false, 99700],
      [2000, 2000, false, 102000],
    ])(
      'should score (%p, %p, onCorridor=%p) as %p',
      (origin, destination, isOnCorridor, expected) => {
        expect(
          scorer.calculateMatchingScore(origin, destination, isOnCorridor),
        ).toBe(expected);
      },
    );

    it('should add penalty for trips not on corridor when far', () => {
      const score = scorer.calculateMatchingScore(800, 600, false);
      expect(score).toBe(99700);
    });

    it('should apply single close-point bonus when only origin is close', () => {
      // (500 + 2000) / 2 - 500 = 750
      expect(scorer.calculateMatchingScore(500, 2000, true)).toBe(750);
    });

    it('should apply single close-point bonus when only destination is close', () => {
      // (2000 + 500) / 2 - 500 = 750
      expect(scorer.calculateMatchingScore(2000, 500, true)).toBe(750);
    });

    it('should apply no bonus when both points are far', () => {
      expect(scorer.calculateMatchingScore(2000, 3000, true)).toBe(2500);
    });

    it('should ensure non-negative scores', () => {
      expect(scorer.calculateMatchingScore(100, 100, true)).toBe(0);
    });

    it('should treat exactly 1000m as not close (strict <)', () => {
      // (1000 + 1000) / 2 = 1000, no bonus
      expect(scorer.calculateMatchingScore(1000, 1000, true)).toBe(1000);
    });
  });
});

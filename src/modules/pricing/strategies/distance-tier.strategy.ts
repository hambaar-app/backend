/**
 * One billed distance bucket. The first tier owns the open interval
 * (0, upToKm]; every following tier owns (previousUpToKm, upToKm].
 *
 * B-10 fix: the legacy implementation computed tier capacity as
 * `maxKm - minKm + (minKm ? 1 : 0)` — a hand-tuned `+1` that silently
 * compensated for its own 1-based bounds (101, 301, 601, 1001). Rewriting it
 * as cumulative bounds makes the algebra explicit: with `minKm = prevMax + 1`,
 * the legacy capacity `maxKm - minKm + 1` reduces exactly to
 * `upToKm - previousUpToKm`, so the span below reproduces the legacy output
 * byte-for-byte without any magic constant.
 */
export class DistanceTier {
  constructor(
    /** Cumulative upper bound in km, or `null` for the open-ended last tier. */
    public readonly upToKm: number | null,
    public readonly ratePerKm: number,
    /** Upper bound of the previous tier (0 for the first tier). */
    private readonly previousUpToKm: number,
  ) {}

  /** Kilometres this tier bills, derived purely from the configured bounds. */
  getSpanKm(): number {
    if (this.upToKm === null) {
      return Infinity;
    }
    return this.upToKm - this.previousUpToKm;
  }
}

/** Tiered per-kilometre distance cost (plus a flat fuel rate per km). */
export class DistanceTierStrategy {
  constructor(
    private readonly fuelRate: number,
    private readonly tiers: DistanceTier[],
  ) {}

  calculate(distanceKm: number): number {
    let totalCost = this.fuelRate * distanceKm;
    let remainingDistance = distanceKm;

    for (const tier of this.tiers) {
      // Guard clause (B-10): stop as soon as every km has been billed so the
      // open-ended tier can never re-bill, and non-positive distances exit
      // before any tier arithmetic runs.
      if (remainingDistance <= 0) {
        break;
      }

      const applicableDistance = Math.min(remainingDistance, tier.getSpanKm());

      totalCost += applicableDistance * tier.ratePerKm;
      remainingDistance -= applicableDistance;
    }

    return totalCost;
  }
}

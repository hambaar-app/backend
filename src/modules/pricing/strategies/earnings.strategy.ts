/**
 * Driver earnings: share of the final price plus any deviation price,
 * floored to a whole IRR (legacy `Math.floor` semantics preserved).
 */
export class EarningsStrategy {
  constructor(private readonly driverShare: number) {}

  calculate(finalPrice: number, deviationPrice?: number): number {
    return Math.floor(finalPrice * this.driverShare + (deviationPrice ?? 0));
  }
}
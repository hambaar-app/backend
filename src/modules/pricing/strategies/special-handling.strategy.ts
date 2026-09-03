/** Fragile/perishable/both multipliers; 1 when neither flag is set. */
export class SpecialHandlingStrategy {
  constructor(
    private readonly fragileMultiplier: number,
    private readonly perishableMultiplier: number,
    private readonly bothFragilePerishableMultiplier: number,
  ) {}

  calculate(isFragile: boolean, isPerishable: boolean): number {
    if (isFragile && isPerishable) {
      return this.bothFragilePerishableMultiplier;
    }
    if (isFragile) {
      return this.fragileMultiplier;
    }
    if (isPerishable) {
      return this.perishableMultiplier;
    }
    return 1;
  }
}

/** Weight surcharge: free below 500 g, then cost per 100 g above. */
export class WeightStrategy {
  constructor(private readonly weightBaseRate: number) {}

  calculate(weightGr: number): number {
    if (weightGr < 500) {
      return 0;
    }
    return (weightGr / 100) * this.weightBaseRate;
  }
}

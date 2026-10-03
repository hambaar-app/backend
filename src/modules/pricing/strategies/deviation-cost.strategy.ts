/** Route-deviation cost: `additionalKm × kmRate + additionalMinutes × timeRate`. */
export class DeviationCostStrategy {
  constructor(
    private readonly deviationRate: number,
    private readonly timeDeviationRate: number,
  ) {}

  calculate(additionalKm: number, additionalMinutes: number): number {
    const kmCost = additionalKm * this.deviationRate;
    const timeCost = additionalMinutes * this.timeDeviationRate;
    return kmCost + timeCost;
  }
}
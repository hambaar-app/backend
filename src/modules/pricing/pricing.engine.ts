import { PricingInput, PricingResult } from './pricing.types';

import { PricingStrategies } from './strategies/pricing-factory';

/**
 * Pure pricing pipeline extracted verbatim from the legacy `PricingService`.
 * Every arithmetic expression keeps its original order and form so results
 * are bit-for-bit identical (proven against a golden capture of the legacy
 * implementation across 5 configuration variants — see pricing-golden.json).
 */
export class PricingEngine {
  constructor(private readonly strategies: PricingStrategies) {}

  calculateSuggestedPrice(input: PricingInput): PricingResult {
    const { basePrice } = this.strategies;
    const distanceCost = this.strategies.distanceTierStrategy.calculate(
      input.distanceKm,
    );
    const weightCost = this.strategies.weightStrategy.calculate(input.weightGr);

    // Subtotal before multipliers, then special handling, then city premium —
    // multiplication order matters for float parity with the legacy engine.
    let subtotal = basePrice + distanceCost + weightCost;

    const specialMultiplier =
      this.strategies.specialHandlingStrategy.calculate(
        input.isFragile ?? false,
        input.isPerishable ?? false,
      );
    subtotal *= specialMultiplier;

    const cityPremium = this.strategies.cityPremiumStrategy.calculate(
      input.originCity,
      input.destinationCity,
    );
    subtotal *= cityPremium;

    // Legacy rounding: nearest 1000 IRR.
    const finalPrice = Math.round(subtotal / 1000) * 1000;

    return {
      suggestedPrice: Math.floor(finalPrice),
      breakdown: {
        basePrice,
        distanceCost,
        weightCost,
        deviationCost: 0,
        specialHandlingCost: Math.max(0, specialMultiplier - 1) * finalPrice,
        cityPremiumCost: Math.max(0, cityPremium - 1) * finalPrice,
      },
    };
  }

  calculateTransporterEarnings(
    finalPrice: number,
    deviationPrice?: number,
  ): number {
    return this.strategies.earningsStrategy.calculate(
      finalPrice,
      deviationPrice,
    );
  }

  calculateDeviationCost(
    additionalKm: number,
    additionalMinutes: number,
  ): number {
    return this.strategies.deviationCostStrategy.calculate(
      additionalKm,
      additionalMinutes,
    );
  }

  calculateDistanceCost(distanceKm: number): number {
    return this.strategies.distanceTierStrategy.calculate(distanceKm);
  }
}
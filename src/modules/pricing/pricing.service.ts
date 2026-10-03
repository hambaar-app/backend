import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PricingInput, PricingResult } from './pricing.types';
import { buildPricingStrategies } from './strategies/pricing-factory';
import { PricingEngine } from './pricing.engine';

/**
 * Thin NestJS facade over `PricingEngine`. All arithmetic lives in
 * `PricingEngine` and the strategies; this class exists only to wire the
 * `PRICING_*` configuration once per boot and expose the three methods the
 * rest of the codebase consumes.
 */
@Injectable()
export class PricingService {
  private readonly engine: PricingEngine;

  constructor(configService: ConfigService) {
    this.engine = new PricingEngine(buildPricingStrategies(configService));
  }

  calculateSuggestedPrice(input: PricingInput): PricingResult {
    return this.engine.calculateSuggestedPrice(input);
  }

  calculateTransporterEarnings(
    finalPrice: number,
    deviationPrice?: number,
  ): number {
    return this.engine.calculateTransporterEarnings(finalPrice, deviationPrice);
  }

  calculateDeviationCost(
    additionalKm: number,
    additionalMinutes: number,
  ): number {
    return this.engine.calculateDeviationCost(additionalKm, additionalMinutes);
  }

  calculateDistanceCost(distanceKm: number): number {
    return this.engine.calculateDistanceCost(distanceKm);
  }
}

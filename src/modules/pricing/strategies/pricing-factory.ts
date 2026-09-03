import { ConfigService } from '@nestjs/config';

import { DistanceTier, DistanceTierStrategy } from './distance-tier.strategy';
import { WeightStrategy } from './weight.strategy';
import { SpecialHandlingStrategy } from './special-handling.strategy';
import { CityPremiumStrategy } from './city-premium.strategy';
import { DeviationCostStrategy } from './deviation-cost.strategy';
import { EarningsStrategy } from './earnings.strategy';

/**
 * Single place where `PRICING_*` configuration meets strategy constructors.
 * Defaults mirror the legacy `PricingService` constructor exactly, so a
 * missing env variable produces identical pricing to the pre-refactor engine.
 */
export function buildPricingStrategies(config: ConfigService) {
  const driverShare = config.get<number>('PRICING_DRIVER_SHARE', 0.7);

  const distanceTierStrategy = new DistanceTierStrategy(
    config.get<number>('PRICING_FUEL_RATE', 200),
    buildDistanceTiers(config),
  );

  return {
    distanceTierStrategy,
    weightStrategy: new WeightStrategy(
      config.get<number>('PRICING_WEIGHT_BASE_RATE', 10000),
    ),
    specialHandlingStrategy: new SpecialHandlingStrategy(
      config.get<number>('PRICING_FRAGILE_MULTIPLIER', 1.25),
      config.get<number>('PRICING_PERISHABLE_MULTIPLIER', 1.35),
      config.get<number>('PRICING_BOTH_FRAGILE_PERISHABLE', 1.5),
    ),
    cityPremiumStrategy: new CityPremiumStrategy(
      config.get<number>('PRICING_MAJOR_CITY_ORIGIN', 0.9),
      config.get<number>('PRICING_MAJOR_CITY_DESTINATION', 1.3),
      config.get<number>('PRICING_BOTH_MAJOR_CITIES', 1.0),
      config.get<number>('PRICING_SMALL_CITY_FACTOR', 1.2),
      parseMajorCities(
        config.get<string>('PRICING_MAJOR_CITIES', 'تهران,اصفهان,مشهد'),
      ),
    ),
    deviationCostStrategy: new DeviationCostStrategy(
      config.get<number>('PRICING_DEVIATION_RATE', 15000),
      config.get<number>('PRICING_TIME_DEVIATION_RATE', 5000),
    ),
    earningsStrategy: new EarningsStrategy(driverShare),
    basePrice: config.get<number>('PRICING_BASE_PRICE', 50000),
  };
}

export type PricingStrategies = ReturnType<typeof buildPricingStrategies>;

/** Parses the comma-separated `PRICING_MAJOR_CITIES` env value. */
export function parseMajorCities(majorCitiesString: string): string[] {
  return majorCitiesString.split(',').map((city) => city.trim());
}

/** Cumulative distance tiers; spans are derived, never hand-written. */
function buildDistanceTiers(config: ConfigService): DistanceTier[] {
  const bounds: Array<[number | null, string]> = [
    [100, 'PRICING_TIER_1_RATE'],
    [300, 'PRICING_TIER_2_RATE'],
    [600, 'PRICING_TIER_3_RATE'],
    [1000, 'PRICING_TIER_4_RATE'],
    [null, 'PRICING_TIER_5_RATE'],
  ];

  const defaultRates = [1000, 950, 850, 750, 600];

  return bounds.map(([upToKm, configName], index) => {
    const previousUpToKm = index === 0 ? 0 : (bounds[index - 1][0] as number);
    return new DistanceTier(
      upToKm,
      config.get<number>(configName, defaultRates[index]),
      previousUpToKm,
    );
  });
}
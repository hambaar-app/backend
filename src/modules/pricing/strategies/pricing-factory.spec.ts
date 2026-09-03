import { ConfigService } from '@nestjs/config';

import { PricingEngine } from '../pricing.engine';
import { buildPricingStrategies, parseMajorCities } from './pricing-factory';

const TEHRAN = '\u062A\u0647\u0631\u0627\u0646';
const ISFAHAN = '\u0627\u0635\u0641\u0647\u0627\u0646';
const KARAJ = '\u06A9\u0631\u062C';
const SHIRAZ = '\u0634\u06CC\u0631\u0627\u0632';
const MASHHAD = '\u0645\u0634\u0647\u062F';

function makeEngine(overrides: Record<string, unknown> = {}): PricingEngine {
  const config = {
    get: (key: string, def?: unknown) =>
      key in overrides ? overrides[key] : def,
  };
  return new PricingEngine(
    buildPricingStrategies(config as unknown as ConfigService),
  );
}

describe('parseMajorCities', () => {
  it('splits and trims the comma-separated list', () => {
    expect(parseMajorCities('\u062A\u0647\u0631\u0627\u0646, \u0627\u0635\u0641\u0647\u0627\u0646 ,\u0645\u0634\u0647\u062F')).toEqual([
      TEHRAN,
      ISFAHAN,
      MASHHAD,
    ]);
  });
});

describe('buildPricingStrategies', () => {
  it('applies legacy defaults end-to-end', () => {
    const engine = makeEngine();

    expect(engine.calculateTransporterEarnings(100000)).toBe(70000);
    expect(engine.calculateDistanceCost(1000)).toBe(1045000);

    const price = engine.calculateSuggestedPrice({
      distanceKm: 100,
      weightGr: 2,
      originCity: TEHRAN,
      destinationCity: ISFAHAN,
    });
    expect(price.suggestedPrice).toBe(170000);
  });

  it('honours tier-rate overrides', () => {
    const engine = makeEngine({ PRICING_TIER_1_RATE: 800 });

    // fuel 200/km + 800/km tier-1 rate for the first 100 km.
    expect(engine.calculateDistanceCost(100)).toBe(100000);
  });

  it('honours base-price and driver-share overrides', () => {
    const engine = makeEngine({
      PRICING_BASE_PRICE: 60000,
      PRICING_DRIVER_SHARE: 0.65,
    });

    expect(engine.calculateTransporterEarnings(100000)).toBe(65000);

    const price = engine.calculateSuggestedPrice({
      distanceKm: 100,
      weightGr: 0,
      originCity: TEHRAN,
      destinationCity: ISFAHAN,
    });
    expect(price.breakdown.basePrice).toBe(60000);
    expect(price.suggestedPrice).toBe(180000);
  });

  it('honours major-city list overrides', () => {
    const engine = makeEngine({ PRICING_MAJOR_CITIES: SHIRAZ + ',' + KARAJ });

    // karaj→shiraz are now both major: factor 1.0 instead of 1.2.
    const price = engine.calculateSuggestedPrice({
      distanceKm: 100,
      weightGr: 0,
      originCity: KARAJ,
      destinationCity: SHIRAZ,
    });
    expect(price.suggestedPrice).toBe(170000);
    expect(price.breakdown.cityPremiumCost).toBe(0);
  });
});
import { ConfigService } from '@nestjs/config';

import { PricingService } from './pricing.service';

// Persian city names kept as escapes so the spec file stays ASCII on disk.
const TEHRAN = '\u062A\u0647\u0631\u0627\u0646';
const ISFAHAN = '\u0627\u0635\u0641\u0647\u0627\u0646';
const KARAJ = '\u06A9\u0631\u062C';
const SHIRAZ = '\u0634\u06CC\u0631\u0627\u0632';

/** Minimal ConfigService stand-in backed by a plain record. */
function makeService(
  overrides: Record<string, unknown> = {},
): PricingService {
  const config = {
    get: (key: string, def?: unknown) =>
      key in overrides ? overrides[key] : def,
  };
  return new PricingService(config as unknown as ConfigService);
}

describe('PricingService', () => {
  it('returns the legacy suggested-price result shape (golden base case)', () => {
    expect(
      makeService().calculateSuggestedPrice({
        distanceKm: 100,
        weightGr: 2,
        isFragile: false,
        isPerishable: false,
        originCity: TEHRAN,
        destinationCity: ISFAHAN,
      }),
    ).toEqual({
      suggestedPrice: 170000,
      breakdown: {
        basePrice: 50000,
        distanceCost: 120000,
        weightCost: 0,
        deviationCost: 0,
        specialHandlingCost: 0,
        cityPremiumCost: 0,
      },
    });
  });

  it('delegates a flag combination to the engine (both flags)', () => {
    expect(
      makeService().calculateSuggestedPrice({
        distanceKm: 100,
        weightGr: 2,
        isFragile: true,
        isPerishable: true,
        originCity: TEHRAN,
        destinationCity: ISFAHAN,
      }).suggestedPrice,
    ).toBe(255000);
  });

  it('rounds suggested prices to the nearest 1000 IRR', () => {
    // Default config: 50000 + 120000 (distance 100) = 170000; two small
    // cities ×1.205 → raw subtotal 204850. Nearest-1000 rounding gives
    // 205000; a truncating implementation would return 204000 instead.
    const service = makeService({ PRICING_SMALL_CITY_FACTOR: 1.205 });

    const result = service.calculateSuggestedPrice({
      distanceKm: 100,
      weightGr: 0,
      originCity: KARAJ,
      destinationCity: SHIRAZ,
    });

    expect(result.suggestedPrice % 1000).toBe(0);
    expect(result.suggestedPrice).toBe(205000);
  });

  it('calculates transporter earnings with legacy floor semantics', () => {
    const service = makeService();

    expect(service.calculateTransporterEarnings(100000, 5000)).toBe(75000);
    expect(service.calculateTransporterEarnings(100000)).toBe(70000);
    expect(service.calculateTransporterEarnings(123456.78)).toBe(86419);
    expect(service.calculateTransporterEarnings(99999.99, 1234.56)).toBe(71234);
  });

  it('calculates deviation cost', () => {
    expect(makeService().calculateDeviationCost(5, 10)).toBe(125000);
    expect(makeService().calculateDeviationCost(0, 30)).toBe(150000);
  });

  it('calculates distance cost', () => {
    expect(makeService().calculateDistanceCost(150)).toBe(177500);
    expect(makeService().calculateDistanceCost(0)).toBe(0);
  });

  it('honours configuration overrides (customBase legacy variant)', () => {
    const service = makeService({
      PRICING_BASE_PRICE: 60000,
      PRICING_FUEL_RATE: 150,
      PRICING_DRIVER_SHARE: 0.65,
    });

    const price = service.calculateSuggestedPrice({
      distanceKm: 100,
      weightGr: 2,
      originCity: TEHRAN,
      destinationCity: ISFAHAN,
    });

    expect(price.suggestedPrice).toBe(175000);
    expect(service.calculateTransporterEarnings(175000)).toBe(113750);
  });
});

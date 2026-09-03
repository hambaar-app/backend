import { PricingEngine } from './pricing.engine';
import { buildPricingStrategies } from './strategies/pricing-factory';
import { PricingInput } from './pricing.types';

// Persian city names kept as escapes so the spec file stays ASCII on disk
// while still exercising the exact values the engine is configured with.
const TEHRAN = '\u062A\u0647\u0631\u0627\u0646';
const ISFAHAN = '\u0627\u0635\u0641\u0647\u0627\u0646';
const KARAJ = '\u06A9\u0631\u062C';
const SHIRAZ = '\u0634\u06CC\u0631\u0627\u0632';
const MASHHAD = '\u0645\u0634\u0647\u062F';
const TABRIZ = '\u062A\u0628\u0631\u06CC\u0632';

/** Compact pricing-input builder. */
const T = (d: number, w: number, o: string, to: string, f = false, p = false): PricingInput => ({
  distanceKm: d,
  weightGr: w,
  isFragile: f,
  isPerishable: p,
  originCity: o,
  destinationCity: to,
});

/** Breakdown builder with the legacy deviationCost: 0 field. */
const B = (
  basePrice: number,
  distanceCost: number,
  weightCost: number,
  specialHandlingCost: number,
  cityPremiumCost: number,
) => ({
  basePrice,
  distanceCost,
  weightCost,
  deviationCost: 0,
  specialHandlingCost,
  cityPremiumCost,
});

/** Golden case builder. */
const C = (
  label: string,
  input: PricingInput,
  suggestedPrice: number,
  distanceCost: number,
  breakdown: ReturnType<typeof B>,
): GoldenCase => ({ label, input, suggestedPrice, distanceCost, breakdown });

interface GoldenCase {
  label: string;
  input: PricingInput;
  suggestedPrice: number;
  distanceCost: number;
  breakdown: ReturnType<typeof B>;
}

/**
 * Golden values captured verbatim from the pre-refactor PricingService
 * (bit-exact floats preserved). The full 5-variant capture was validated in a
 * separate parity harness; the default variant is embedded below.
 */

const GOLDEN_PRICE_CASES: GoldenCase[] = [
  C("base", T(100, 2, TEHRAN, ISFAHAN), 170000, 120000, B(50000, 120000, 0, 0, 0)),
  C("fragile", T(100, 2, TEHRAN, ISFAHAN, true, false), 213000, 120000, B(50000, 120000, 0, 53250, 0)),
  C("perishable", T(100, 2, TEHRAN, ISFAHAN, false, true), 230000, 120000, B(50000, 120000, 0, 80500.00000000001, 0)),
  C("both-flags", T(100, 2, TEHRAN, ISFAHAN, true, true), 255000, 120000, B(50000, 120000, 0, 127500, 0)),
  C("tiny-distance-zero-weight", T(0.5, 0, TEHRAN, TEHRAN), 51000, 600, B(50000, 600, 0, 0, 0)),
  C("weight-499", T(100, 499, TEHRAN, ISFAHAN), 170000, 120000, B(50000, 120000, 0, 0, 0)),
  C("weight-500", T(100, 500, TEHRAN, ISFAHAN), 220000, 120000, B(50000, 120000, 50000, 0, 0)),
  C("weight-1000", T(100, 1000, TEHRAN, ISFAHAN), 270000, 120000, B(50000, 120000, 100000, 0, 0)),
  C("weight-2750", T(100, 2750, TEHRAN, ISFAHAN), 445000, 120000, B(50000, 120000, 275000, 0, 0)),
  C("city-nonmajor-dest", T(1, 0, TEHRAN, KARAJ), 46000, 1200, B(50000, 1200, 0, 0, 0)),
  C("city-major-origin", T(100, 0, TEHRAN, KARAJ), 153000, 120000, B(50000, 120000, 0, 0, 0)),
  C("city-major-dest", T(100, 0, KARAJ, TEHRAN), 221000, 120000, B(50000, 120000, 0, 0, 66300.00000000001)),
  C("city-small-both", T(100, 0, KARAJ, SHIRAZ), 204000, 120000, B(50000, 120000, 0, 0, 40799.99999999999)),
  C("city-both-major", T(100, 0, TEHRAN, TEHRAN), 170000, 120000, B(50000, 120000, 0, 0, 0)),
  C("km-50.5", T(50.5, 0, TEHRAN, ISFAHAN), 111000, 60600, B(50000, 60600, 0, 0, 0)),
  C("km-100", T(100, 0, TEHRAN, ISFAHAN), 170000, 120000, B(50000, 120000, 0, 0, 0)),
  C("km-101", T(101, 0, TEHRAN, ISFAHAN), 171000, 121150, B(50000, 121150, 0, 0, 0)),
  C("km-150", T(150, 0, TEHRAN, ISFAHAN), 228000, 177500, B(50000, 177500, 0, 0, 0)),
  C("km-300", T(300, 0, TEHRAN, ISFAHAN), 400000, 350000, B(50000, 350000, 0, 0, 0)),
  C("km-301", T(301, 0, TEHRAN, ISFAHAN), 401000, 351050, B(50000, 351050, 0, 0, 0)),
  C("km-600", T(600, 0, TEHRAN, ISFAHAN), 715000, 665000, B(50000, 665000, 0, 0, 0)),
  C("km-601", T(601, 0, TEHRAN, ISFAHAN), 716000, 665950, B(50000, 665950, 0, 0, 0)),
  C("km-1000", T(1000, 0, TEHRAN, ISFAHAN), 1095000, 1045000, B(50000, 1045000, 0, 0, 0)),
  C("km-1001", T(1001, 0, TEHRAN, ISFAHAN), 1096000, 1045800, B(50000, 1045800, 0, 0, 0)),
  C("km-1500", T(1500, 0, TEHRAN, ISFAHAN), 1495000, 1445000, B(50000, 1445000, 0, 0, 0)),
  C("km-265-multitier", T(265, 0, TEHRAN, ISFAHAN), 360000, 309750, B(50000, 309750, 0, 0, 0)),
  C("precision-150.5-2750-both", T(150.5, 2750, TEHRAN, ISFAHAN, true, true), 755000, 178075, B(50000, 178075, 275000, 377500, 0)),
  C("precision-355.7-1234-perishable", T(355.7, 1234, ISFAHAN, KARAJ, false, true), 707000, 408485, B(50000, 408485, 123400, 247450.00000000006, 0)),
  C("zero-everything", T(0, 0, TEHRAN, ISFAHAN), 50000, 0, B(50000, 0, 0, 0, 0)),
  C("tier5-heavy", T(2500, 10000, MASHHAD, TEHRAN), 3295000, 2245000, B(50000, 2245000, 1000000, 0, 0)),
];

const GOLDEN_EARNINGS: Array<[string, number, number | undefined, number]> = [
  ["no-deviation", 100000, undefined, 70000],
  ["with-deviation", 100000, 5000, 75000],
  ["zero-price", 0, undefined, 0],
  ["fractional", 123456.78, undefined, 86419],
  ["fractional-with-deviation", 99999.99, 1234.56, 71234],
];

const GOLDEN_DEVIATION: Array<[string, number, number, number]> = [
  ["zero", 0, 0, 0],
  ["typical", 5, 10, 125000],
  ["fractional", 12.5, 7.5, 225000],
  ["time-only", 0, 30, 150000],
  ["km-only", 100, 0, 1500000],
];

/** Engine wired with the legacy default configuration. */
function makeEngine(): PricingEngine {
  const config = {
    get: (key: string, def?: unknown) => {
      const overrides: Record<string, unknown> = {
        PRICING_BASE_PRICE: 50000,
        PRICING_FUEL_RATE: 200,
        PRICING_WEIGHT_BASE_RATE: 10000,
        PRICING_DRIVER_SHARE: 0.7,
        PRICING_FRAGILE_MULTIPLIER: 1.25,
        PRICING_PERISHABLE_MULTIPLIER: 1.35,
        PRICING_BOTH_FRAGILE_PERISHABLE: 1.5,
        PRICING_MAJOR_CITY_ORIGIN: 0.9,
        PRICING_MAJOR_CITY_DESTINATION: 1.3,
        PRICING_BOTH_MAJOR_CITIES: 1.0,
        PRICING_SMALL_CITY_FACTOR: 1.2,
        PRICING_DEVIATION_RATE: 15000,
        PRICING_TIME_DEVIATION_RATE: 5000,
        PRICING_MAJOR_CITIES: TEHRAN + ',' + ISFAHAN + ',' + MASHHAD,
        PRICING_TIER_1_RATE: 1000,
        PRICING_TIER_2_RATE: 950,
        PRICING_TIER_3_RATE: 850,
        PRICING_TIER_4_RATE: 750,
        PRICING_TIER_5_RATE: 600,
      };
      return key in overrides ? overrides[key] : def;
    },
  };
  return new PricingEngine(buildPricingStrategies(config as never));
}

describe('PricingEngine (bit-for-bit legacy parity, default variant)', () => {
  it.each(GOLDEN_PRICE_CASES.map((c) => [c.label, c]))(
    'suggested price + breakdown for %s matches the legacy capture',
    (_label, c) => {
      const engine = makeEngine();
      expect(engine.calculateSuggestedPrice(c.input)).toEqual({
        suggestedPrice: c.suggestedPrice,
        breakdown: c.breakdown,
      });
      expect(engine.calculateDistanceCost(c.input.distanceKm)).toBe(
        c.distanceCost,
      );
    },
  );

  it.each(GOLDEN_EARNINGS)('transporter earnings for %s', (_label, finalPrice, deviationPrice, expected) => {
    expect(makeEngine().calculateTransporterEarnings(finalPrice, deviationPrice)).toBe(expected);
  });

  it.each(GOLDEN_DEVIATION)('deviation cost for %s', (_label, km, minutes, expected) => {
    expect(makeEngine().calculateDeviationCost(km, minutes)).toBe(expected);
  });
});

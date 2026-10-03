import { DistanceTier, DistanceTierStrategy } from './distance-tier.strategy';

/** Builds the default 5-tier configuration exactly like pricing-factory does. */
function buildDefaultTiers(
  rates: number[] = [1000, 950, 850, 750, 600],
): DistanceTier[] {
  const bounds: Array<[number | null, number]> = [
    [100, rates[0]],
    [300, rates[1]],
    [600, rates[2]],
    [1000, rates[3]],
    [null, rates[4]],
  ];
  return bounds.map(
    ([upToKm, rate], index) =>
      new DistanceTier(
        upToKm,
        rate,
        index === 0 ? 0 : (bounds[index - 1][0] as number),
      ),
  );
}

describe('DistanceTier', () => {
  it('derives spans from cumulative bounds with no hand-written widths', () => {
    expect(buildDefaultTiers().map((tier) => tier.getSpanKm())).toEqual([
      100, 200, 300, 400, Infinity,
    ]);
  });
});

describe('DistanceTierStrategy (default legacy rates)', () => {
  const strategy = new DistanceTierStrategy(200, buildDefaultTiers());

  it.each([
    [0, 0],
    [50.5, 60600],
    [100, 120000],
    [101, 121150],
    [150, 177500],
    [265, 309750],
    [300, 350000],
    [301, 351050],
    [600, 665000],
    [601, 665950],
    [1000, 1045000],
    [1001, 1045800],
    [1500, 1445000],
    [2500, 2245000],
  ])('distance %p km costs %p (legacy golden value)', (km, expected) => {
    expect(strategy.calculate(km)).toBe(expected);
  });
});

describe('DistanceTierStrategy (custom configuration)', () => {
  it('honours custom tier rates (legacy customTiers variant)', () => {
    const strategy = new DistanceTierStrategy(
      200,
      buildDefaultTiers([800, 700, 600, 500, 400]),
    );

    expect(strategy.calculate(101)).toBe(100900);
    expect(strategy.calculate(1001)).toBe(800600);
  });

  it('honours a custom fuel rate (legacy customBase variant)', () => {
    const strategy = new DistanceTierStrategy(150, buildDefaultTiers());

    expect(strategy.calculate(100)).toBe(115000);
    expect(strategy.calculate(0.5)).toBe(575);
  });
});

import { SpecialHandlingStrategy } from './special-handling.strategy';

describe('SpecialHandlingStrategy', () => {
  const strategy = new SpecialHandlingStrategy(1.25, 1.35, 1.5);

  it('returns 1 when neither flag is set', () => {
    expect(strategy.calculate(false, false)).toBe(1);
  });

  it('returns the fragile multiplier', () => {
    expect(strategy.calculate(true, false)).toBe(1.25);
  });

  it('returns the perishable multiplier', () => {
    expect(strategy.calculate(false, true)).toBe(1.35);
  });

  it('both flags win over the single-flag multipliers', () => {
    expect(strategy.calculate(true, true)).toBe(1.5);
  });

  it('honours custom multipliers', () => {
    const custom = new SpecialHandlingStrategy(2, 3, 5);

    expect(custom.calculate(true, false)).toBe(2);
    expect(custom.calculate(false, true)).toBe(3);
    expect(custom.calculate(true, true)).toBe(5);
  });
});

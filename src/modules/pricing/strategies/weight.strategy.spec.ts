import { WeightStrategy } from './weight.strategy';

describe('WeightStrategy', () => {
  const strategy = new WeightStrategy(10000);

  it('charges nothing below the 500 g threshold', () => {
    expect(strategy.calculate(0)).toBe(0);
    expect(strategy.calculate(1)).toBe(0);
    expect(strategy.calculate(499)).toBe(0);
  });

  it('bills from exactly 500 g upward, per 100 g (threshold inclusive)', () => {
    expect(strategy.calculate(500)).toBeCloseTo(50000, 6);
    expect(strategy.calculate(1000)).toBeCloseTo(100000, 6);
    expect(strategy.calculate(2750)).toBeCloseTo(275000, 6);
  });

  it('bills fractional weights with legacy arithmetic', () => {
    expect(strategy.calculate(1234)).toBeCloseTo(123400, 6);
    expect(strategy.calculate(723.4)).toBeCloseTo(72340, 6);
  });

  it('honours the configured base rate', () => {
    expect(new WeightStrategy(12345).calculate(1000)).toBeCloseTo(123450, 6);
  });
});

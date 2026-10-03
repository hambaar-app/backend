import { EarningsStrategy } from './earnings.strategy';

describe('EarningsStrategy', () => {
  it('matches the legacy earnings table (golden default)', () => {
    const strategy = new EarningsStrategy(0.7);

    expect(strategy.calculate(100000)).toBe(70000);
    expect(strategy.calculate(100000, 5000)).toBe(75000);
    expect(strategy.calculate(0)).toBe(0);
    expect(strategy.calculate(123456.78)).toBe(86419);
    expect(strategy.calculate(99999.99, 1234.56)).toBe(71234);
  });

  it('floors the final result (legacy Math.floor semantics)', () => {
    const strategy = new EarningsStrategy(0.7);

    expect(strategy.calculate(99999.99)).toBe(69999);
  });

  it('honours a custom driver share', () => {
    const strategy = new EarningsStrategy(0.65);

    expect(strategy.calculate(100000)).toBe(65000);
    expect(strategy.calculate(100000, 5000)).toBe(70000);
    expect(strategy.calculate(123456.78)).toBe(80246);
    expect(strategy.calculate(99999.99, 1234.56)).toBe(66234);
  });
});
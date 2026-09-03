import { DeviationCostStrategy } from './deviation-cost.strategy';

describe('DeviationCostStrategy', () => {
  const strategy = new DeviationCostStrategy(15000, 5000);

  it('charges nothing for a zero deviation', () => {
    expect(strategy.calculate(0, 0)).toBe(0);
  });

  it('combines km cost and time cost additively (legacy golden values)', () => {
    expect(strategy.calculate(5, 10)).toBe(125000);
    expect(strategy.calculate(0, 30)).toBe(150000);
    expect(strategy.calculate(100, 0)).toBe(1500000);
  });

  it('handles fractional km and minutes like the legacy engine', () => {
    expect(strategy.calculate(12.5, 7.5)).toBe(225000);
  });

  it('honours custom rates', () => {
    const custom = new DeviationCostStrategy(100, 10);

    expect(custom.calculate(3, 4)).toBe(340);
    expect(custom.calculate(0, 4)).toBe(40);
    expect(custom.calculate(3, 0)).toBe(300);
  });
});

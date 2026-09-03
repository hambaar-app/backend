import { CityPremiumStrategy } from './city-premium.strategy';

// Persian city names kept as escapes so the spec file stays ASCII on disk.
const TEHRAN = '\u062A\u0647\u0631\u0627\u0646';
const ISFAHAN = '\u0627\u0635\u0641\u0647\u0627\u0646';
const KARAJ = '\u06A9\u0631\u062C';
const SHIRAZ = '\u0634\u06CC\u0631\u0627\u0632';
const MASHHAD = '\u0645\u0634\u0647\u062F';

describe('CityPremiumStrategy', () => {
  const strategy = new CityPremiumStrategy(0.9, 1.3, 1.0, 1.2, [
    TEHRAN,
    ISFAHAN,
    MASHHAD,
  ]);

  it('major origin + major destination uses the both-major factor', () => {
    expect(strategy.calculate(TEHRAN, MASHHAD)).toBe(1.0);
  });

  it('major origin only uses the origin factor', () => {
    expect(strategy.calculate(TEHRAN, KARAJ)).toBe(0.9);
  });

  it('major destination only uses the destination factor', () => {
    expect(strategy.calculate(KARAJ, ISFAHAN)).toBe(1.3);
  });

  it('two small cities use the small-city factor', () => {
    expect(strategy.calculate(KARAJ, SHIRAZ)).toBe(1.2);
  });

  it('matches cities case-insensitively (legacy behaviour)', () => {
    const latin = new CityPremiumStrategy(0.9, 1.3, 1.0, 1.2, ['Tehran']);

    expect(latin.calculate('tehran', KARAJ)).toBe(0.9);
    expect(latin.calculate('TEHRAN', 'TEHRAN')).toBe(1.0);
  });

  it('honours custom factors', () => {
    const custom = new CityPremiumStrategy(2, 3, 0.5, 1.1, [TEHRAN, MASHHAD]);

    expect(custom.calculate(MASHHAD, KARAJ)).toBe(2);
    expect(custom.calculate(KARAJ, MASHHAD)).toBe(3);
    expect(custom.calculate(MASHHAD, MASHHAD)).toBe(0.5);
    expect(custom.calculate(KARAJ, SHIRAZ)).toBe(1.1);
  });
});

import { formatMoney } from './money';

describe('formatMoney', () => {
  it.each([
    [0n, '0'],
    [5n, '5'],
    [-5n, '-5'],
    [9007199254740993n, '9007199254740993'],
  ])('should format %p as %p', (input, expected) => {
    expect(formatMoney(input)).toBe(expected);
  });

  it('should map null and undefined to undefined', () => {
    expect(formatMoney(null)).toBeUndefined();
    expect(formatMoney(undefined)).toBeUndefined();
  });
});

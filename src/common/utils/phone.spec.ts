import { maskPhoneNumber } from './phone';

describe('maskPhoneNumber', () => {
  describe('masking', () => {
    it.each([
      ['+989121112233', '+98•••••233'],
      ['+98912111233', '+98•••••233'],
      ['09121112233', '091•••••233'],
    ])('should mask %p as %p', (input, expected) => {
      expect(maskPhoneNumber(input)).toBe(expected);
    });

    it('should mask short numbers without a suffix', () => {
      expect(maskPhoneNumber('+98912')).toBe('+98•••••');
    });

    it('should fully mask tiny or empty input', () => {
      expect(maskPhoneNumber('+98')).toBe('•••••');
      expect(maskPhoneNumber('')).toBe('•••••');
    });
  });
});

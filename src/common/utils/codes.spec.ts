import * as crypto from 'crypto';
import {
  generateCode,
  generateSecureOtp,
  generateUniqueCode,
  generateTripCode,
  generateTrackingCode,
} from './codes';

describe('codes', () => {
  describe('generateSecureOtp', () => {
    it('should return a zero-padded 6-digit string', () => {
      const code = generateSecureOtp();
      expect(code).toMatch(/^\d{6}$/);
      expect(code).toHaveLength(6);
    });

    it('should zero-pad values below 100000', () => {
      const spy = jest.spyOn(crypto, 'randomInt') as unknown as jest.Mock;
      spy.mockReturnValue(5);
      expect(generateSecureOtp()).toBe('000005');
      spy.mockRestore();
    });

    it('should cover the full 0–999999 space', () => {
      const spy = jest.spyOn(crypto, 'randomInt') as unknown as jest.Mock;
      spy.mockReturnValueOnce(999_999).mockReturnValueOnce(0);
      expect(generateSecureOtp()).toBe('999999');
      expect(generateSecureOtp()).toBe('000000');
      spy.mockRestore();
    });

    it('should generate unique codes across a large sample', () => {
      let counter = 0;
      const spy = jest.spyOn(crypto, 'randomInt') as unknown as jest.Mock;
      spy.mockImplementation(() => counter++ % 1_000_000);
      const sample = Array.from({ length: 10_000 }, () => generateSecureOtp());
      expect(new Set(sample).size).toBe(10_000);
      spy.mockRestore();
    });
  });

  describe('generateUniqueCode', () => {
    it('should keep the legacy timestamp+random format', () => {
      const code = generateUniqueCode();
      expect(typeof code).toBe('string');
      expect(code).toMatch(/^\d+$/);
      expect(code.length).toBeGreaterThan(13);
    });
  });

  describe('generateTripCode / generateTrackingCode', () => {
    it('should return 8-character base32 codes', () => {
      const trip = generateTripCode();
      const tracking = generateTrackingCode();
      expect(trip).toMatch(/^[A-Z2-7]{8}$/);
      expect(tracking).toMatch(/^[A-Z2-7]{8}$/);
    });

    it('should be unique across a large sample', () => {
      const sample = Array.from({ length: 10_000 }, () => generateTripCode());
      expect(new Set(sample).size).toBe(10_000);
    });

    it('should not include excluded base32 characters (0,1,8,9)', () => {
      const spy = jest.spyOn(crypto, 'randomInt') as unknown as jest.Mock;
      spy
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(8)
        .mockReturnValueOnce(9);
      const trip = generateTripCode();
      expect(trip).toHaveLength(8);
      expect(trip).toMatch(/^[A-Z2-7]{8}$/);
      spy.mockRestore();
    });
  });

  describe('generateCode (deprecated legacy)', () => {
    it('should return a 5-digit number in the legacy range', () => {
      const code = generateCode();
      expect(code).toBeGreaterThanOrEqual(11_111);
      expect(code).toBeLessThan(99_999);
    });
  });
});
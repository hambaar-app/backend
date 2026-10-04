import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createIntegrationApp, truncateDb } from './setup';
import { PricingService } from '../../src/modules/pricing/pricing.service';

/**
 * Pricing parity through the REAL validated ConfigService: the golden base
 * case must equal the unit-test golden (170000 = 50000 base + 120000 for
 * 100 km Tehran→Isfahan). Proves PRICING_* wiring end to end.
 */
describe('Pricing golden parity (integration)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    app = await createIntegrationApp();
  });

  afterAll(async () => {
    await truncateDb(app);
    if (app) await app.close();
  });

  it('matches the unit golden base case with live config', () => {
    if (!app) throw new Error('integration app failed to initialize');
    const pricing = new PricingService(app.get(ConfigService));

    expect(
      pricing.calculateSuggestedPrice({
        distanceKm: 100,
        weightGr: 2,
        isFragile: false,
        isPerishable: false,
        originCity: 'تهران',
        destinationCity: 'اصفهان',
      }),
    ).toEqual({
      suggestedPrice: 170000,
      breakdown: {
        basePrice: 50000,
        distanceCost: 120000,
        weightCost: 0,
        deviationCost: 0,
        specialHandlingCost: 0,
        cityPremiumCost: 0,
      },
    });
  });
});

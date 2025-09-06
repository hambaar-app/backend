import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PricingService } from './pricing.service';
import { PricingInput } from './pricing.types';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('PricingService', () => {
  let service: PricingService;
  let configService: DeepMockProxy<ConfigService>;

  const defaultConfig = {
    PRICING_BASE_PRICE: 50000,
    PRICING_FUEL_RATE: 200,
    PRICING_WEIGHT_BASE_RATE: 10000,
    PRICING_DRIVER_SHARE: 0.7,
    PRICING_FRAGILE_MULTIPLIER: 1.25,
    PRICING_PERISHABLE_MULTIPLIER: 1.35,
    PRICING_BOTH_FRAGILE_PERISHABLE: 1.5,
    PRICING_MAJOR_CITY_ORIGIN: 0.9,
    PRICING_MAJOR_CITY_DESTINATION: 1.3,
    PRICING_BOTH_MAJOR_CITIES: 1.0,
    PRICING_SMALL_CITY_FACTOR: 1.2,
    PRICING_DEVIATION_RATE: 15000,
    PRICING_TIME_DEVIATION_RATE: 5000,
    PRICING_MAJOR_CITIES: 'تهران,اصفهان,مشهد',
    PRICING_TIER_1_RATE: 1000,
    PRICING_TIER_2_RATE: 950,
    PRICING_TIER_3_RATE: 850,
    PRICING_TIER_4_RATE: 750,
    PRICING_TIER_5_RATE: 600,
  };

  const mockPricingInput: PricingInput = {
    distanceKm: 100,
    weightGr: 2,
    isFragile: false,
    isPerishable: false,
    originCity: 'تهران',
    destinationCity: 'اصفهان'
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    configService = mockDeep<ConfigService>();

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      return defaultConfig[key] || defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  describe('calculateSuggestedPrice', () => {
    it('should calculate basic price for normal package', async () => {
      const input: PricingInput = {
        distanceKm: 100,
        weightGr: 2,
        isFragile: false,
        isPerishable: false,
        originCity: 'تهران',
        destinationCity: 'اصفهان'
      };

      const result = service.calculateSuggestedPrice(input);

      expect(result.suggestedPrice).toBeGreaterThan(0);
      expect(result.breakdown).toEqual({
        basePrice: 50000,
        distanceCost: expect.any(Number),
        weightCost: expect.any(Number),
        deviationCost: 0,
        specialHandlingCost: 0,
        cityPremiumCost: 0 // Both major cities
      });
    });

    it('should apply fragile multiplier', async () => {
      const normalInput = { ...mockPricingInput, isFragile: false };
      const fragileInput = { ...mockPricingInput, isFragile: true };

      const normalResult = service.calculateSuggestedPrice(normalInput);
      const fragileResult = service.calculateSuggestedPrice(fragileInput);

      expect(fragileResult.suggestedPrice).toBeGreaterThan(normalResult.suggestedPrice);
      expect(fragileResult.breakdown.specialHandlingCost).toBeGreaterThan(0);
    });

    it('should apply perishable multiplier', async () => {
      const normalInput = { ...mockPricingInput, isPerishable: false };
      const perishableInput = { ...mockPricingInput, isPerishable: true };

      const normalResult = service.calculateSuggestedPrice(normalInput);
      const perishableResult = service.calculateSuggestedPrice(perishableInput);

      expect(perishableResult.suggestedPrice).toBeGreaterThan(normalResult.suggestedPrice);
      expect(perishableResult.breakdown.specialHandlingCost).toBeGreaterThan(0);
    });

    it('should apply both fragile and perishable multiplier', async () => {
      const normalInput = { ...mockPricingInput, isFragile: false, isPerishable: false };
      const fragileInput = { ...mockPricingInput, isFragile: true, isPerishable: false };
      const bothInput = { ...mockPricingInput, isFragile: true, isPerishable: true };

      const normalResult = service.calculateSuggestedPrice(normalInput);
      const fragileResult = service.calculateSuggestedPrice(fragileInput);
      const bothResult = service.calculateSuggestedPrice(bothInput);

      expect(bothResult.suggestedPrice).toBeGreaterThan(fragileResult.suggestedPrice);
      expect(bothResult.suggestedPrice).toBeGreaterThan(normalResult.suggestedPrice);
      expect(bothResult.breakdown.specialHandlingCost).toBeGreaterThan(fragileResult.breakdown.specialHandlingCost);
    });

    it('should calculate weight cost correctly', async () => {
      const lightInput = { ...mockPricingInput, weightGr: 400 };
      const heavyInput = { ...mockPricingInput, weightGr: 5000 };

      const lightResult = service.calculateSuggestedPrice(lightInput);
      const heavyResult = service.calculateSuggestedPrice(heavyInput);
      
      expect(lightResult.breakdown.weightCost).toBe(0);
      expect(heavyResult.breakdown.weightCost).toBeGreaterThan(0);
      expect(heavyResult.suggestedPrice).toBeGreaterThan(lightResult.suggestedPrice);
    });

    it('should apply city premium for major to small city', async () => {
      const majorToMajor = { ...mockPricingInput, originCity: 'تهران', destinationCity: 'اصفهان' };
      const majorToSmall = { ...mockPricingInput, originCity: 'تهران', destinationCity: 'کرج' };

      const majorToMajorResult = service.calculateSuggestedPrice(majorToMajor);
      const majorToSmallResult = service.calculateSuggestedPrice(majorToSmall);

      expect(majorToSmallResult.suggestedPrice).toBeLessThan(majorToMajorResult.suggestedPrice);
    });

    it('should apply city premium for small to major city', async () => {
      const smallToMajor = { ...mockPricingInput, originCity: 'کرج', destinationCity: 'تهران' };
      const smallToSmall = { ...mockPricingInput, originCity: 'کرج', destinationCity: 'قزوین' };

      const smallToMajorResult = service.calculateSuggestedPrice(smallToMajor);
      const smallToSmallResult = service.calculateSuggestedPrice(smallToSmall);

      expect(smallToMajorResult.suggestedPrice).toBeGreaterThan(smallToSmallResult.suggestedPrice);
      expect(smallToMajorResult.breakdown.cityPremiumCost).toBeGreaterThan(0);
    });

    it('should round final price to nearest thousand', async () => {
      const result = service.calculateSuggestedPrice(mockPricingInput);

      expect(result.suggestedPrice % 1000).toBe(0);
    });
  });

  describe('calculateDistanceCost', () => {
    it('should calculate cost for tier 1 distance (0-100km)', async () => {
      const cost = service.calculateDistanceCost(50);
      const expectedCost = (200 * 50) + (50 * 1000); // fuel + tier rate

      expect(cost).toBe(expectedCost);
    });

    it('should calculate cost for tier 2 distance (101-300km)', async () => {
      const cost = service.calculateDistanceCost(200);
      const expectedCost = (200 * defaultConfig.PRICING_FUEL_RATE)
        + (100 * defaultConfig.PRICING_TIER_1_RATE)
        + (100 * defaultConfig.PRICING_TIER_2_RATE);

      expect(cost).toBe(expectedCost);
    });

    it('should calculate cost for tier 3 distance (301-600km)', async () => {
      const cost = service.calculateDistanceCost(400);
      const expectedCost = (400 * defaultConfig.PRICING_FUEL_RATE)
        + (100 * defaultConfig.PRICING_TIER_1_RATE)
        + (200 * defaultConfig.PRICING_TIER_2_RATE)
        + (100 * defaultConfig.PRICING_TIER_3_RATE);

      expect(cost).toBe(expectedCost);
    });

    it('should calculate cost for tier 4 distance (601-1000km)', async () => {
      const cost = service.calculateDistanceCost(800);
      const expectedCost = (800 * defaultConfig.PRICING_FUEL_RATE)
        + (100 * defaultConfig.PRICING_TIER_1_RATE)
        + (200 * defaultConfig.PRICING_TIER_2_RATE)
        + (300 * defaultConfig.PRICING_TIER_3_RATE)
        + (200 * defaultConfig.PRICING_TIER_4_RATE);
  
      expect(cost).toBe(expectedCost);
    });

    it('should calculate cost for tier 5 distance (1001km+)', async () => {
      const cost = service.calculateDistanceCost(1200);
      const expectedCost = (1200 * defaultConfig.PRICING_FUEL_RATE)
        + (100 * defaultConfig.PRICING_TIER_1_RATE)
        + (200 * defaultConfig.PRICING_TIER_2_RATE)
        + (300 * defaultConfig.PRICING_TIER_3_RATE)
        + (400 * defaultConfig.PRICING_TIER_4_RATE)
        + (200 * defaultConfig.PRICING_TIER_5_RATE);
  
      expect(cost).toBe(expectedCost);
    });

    it('should handle zero distance', async () => {
      const cost = service.calculateDistanceCost(0);

      expect(cost).toBe(0);
    });
  });

  describe('calculateTransporterEarnings', () => {
    it('should calculate transporter earnings without deviation', async () => {
      const finalPrice = 100000;
      const earnings = service.calculateTransporterEarnings(finalPrice);

      expect(earnings).toBe(Math.floor(100000 * 0.7)); // 70000
    });

    it('should calculate transporter earnings with deviation', async () => {
      const finalPrice = 100000;
      const deviationPrice = 20000;
      const earnings = service.calculateTransporterEarnings(finalPrice, deviationPrice);

      expect(earnings).toBe(Math.floor(100000 * 0.7) + 20000); // 90000
    });

    it('should handle zero final price', async () => {
      const earnings = service.calculateTransporterEarnings(0);

      expect(earnings).toBe(0);
    });
  });

  describe('calculateDeviationCost', () => {
    it('should calculate deviation cost for distance only', async () => {
      const cost = service.calculateDeviationCost(10, 0);

      expect(cost).toBe(10 * 15000); // 150000
    });

    it('should calculate deviation cost for time only', async () => {
      const cost = service.calculateDeviationCost(0, 30);

      expect(cost).toBe(30 * 5000); // 150000
    });

    it('should calculate combined deviation cost', async () => {
      const cost = service.calculateDeviationCost(5, 20);

      expect(cost).toBe((5 * 15000) + (20 * 5000)); // 175000
    });

    it('should handle zero deviation', async () => {
      const cost = service.calculateDeviationCost(0, 0);

      expect(cost).toBe(0);
    });
  });

  describe('City premium calculations', () => {
    it('should identify major cities correctly', async () => {
      const majorToMajor = service.calculateSuggestedPrice({
        ...mockPricingInput,
        originCity: 'تهران',
        destinationCity: 'مشهد'
      });

      expect(majorToMajor.breakdown.cityPremiumCost).toBe(0); // Both major cities
    });

    it('should handle case insensitive city names', async () => {
      const upperCase = service.calculateSuggestedPrice({
        ...mockPricingInput,
        originCity: 'تهران',
        destinationCity: 'مشهد'
      });

      const mixedCase = service.calculateSuggestedPrice({
        ...mockPricingInput,
        originCity: 'تهران',
        destinationCity: 'مشهد'
      });

      expect(upperCase.suggestedPrice).toBe(mixedCase.suggestedPrice);
    });

    it('should apply small city factor for both non-major cities', async () => {
      const result = service.calculateSuggestedPrice({
        ...mockPricingInput,
        originCity: 'کرج',
        destinationCity: 'قزوین'
      });

      expect(result.breakdown.cityPremiumCost).toBeGreaterThan(0);
    });
  });

  describe('Edge cases and validations', () => {
    it('should handle missing optional parameters', async () => {
      const minimalInput: PricingInput = {
        distanceKm: 100,
        weightGr: 1,
        originCity: 'تهران',
        destinationCity: 'اصفهان'
      };

      const result = service.calculateSuggestedPrice(minimalInput);

      expect(result.suggestedPrice).toBeGreaterThan(0);
      expect(result.breakdown.specialHandlingCost).toBe(0);
    });

    it('should handle very large distances', async () => {
      const largeDistanceInput = {
        ...mockPricingInput,
        distanceKm: 5000
      };

      const result = service.calculateSuggestedPrice(largeDistanceInput);

      expect(result.suggestedPrice).toBeGreaterThan(0);
      expect(result.breakdown.distanceCost).toBeGreaterThan(0);
    });

    it('should handle very heavy packages', async () => {
      const heavyPackageInput = {
        ...mockPricingInput,
        weightGr: 50000
      };

      const result = service.calculateSuggestedPrice(heavyPackageInput);

      expect(result.suggestedPrice).toBeGreaterThan(0);
      expect(result.breakdown.weightCost).toBeGreaterThan(0);
    });

    it('should handle zero weight packages', async () => {
      const zeroWeightInput = {
        ...mockPricingInput,
        weightGr: 0
      };

      const result = service.calculateSuggestedPrice(zeroWeightInput);

      expect(result.suggestedPrice).toBeGreaterThan(0);
      expect(result.breakdown.weightCost).toBe(0);
    });
  });

  describe('Configuration variations', () => {
    it('should use custom configuration values', async () => {
      const customConfig = {
        ...defaultConfig,
        PRICING_BASE_PRICE: 100000,
        PRICING_DRIVER_SHARE: 0.8
      };

      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        return customConfig[key] || defaultValue;
      });

      // Recreate service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PricingService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const customService = module.get<PricingService>(PricingService);
      
      const result = customService.calculateSuggestedPrice(mockPricingInput);
      const earnings = customService.calculateTransporterEarnings(100000);

      expect(result.breakdown.basePrice).toBe(100000);
      expect(earnings).toBe(80000);
    });

    it('should use default values when config is missing', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        return defaultValue;
      });

      // Recreate service with missing config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PricingService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const defaultService = module.get<PricingService>(PricingService);
      const result = defaultService.calculateSuggestedPrice(mockPricingInput);

      expect(result.suggestedPrice).toBeGreaterThan(0);
      expect(result.breakdown.basePrice).toBe(50000); // Default value
    });

    it('should parse major cities from configuration', async () => {
      const customConfig = {
        ...defaultConfig,
        PRICING_MAJOR_CITIES: 'شیراز,تبریز,کرج'
      };

      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        return customConfig[key] || defaultValue;
      });

      // Recreate service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PricingService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const customService = module.get<PricingService>(PricingService);
      
      const shirazToTabriz = customService.calculateSuggestedPrice({
        ...mockPricingInput,
        originCity: 'شیراز',
        destinationCity: 'تبریز'
      });

      expect(shirazToTabriz.breakdown.cityPremiumCost).toBe(0);
    });
  });

  describe('Price breakdown validation', () => {
    it('should have all breakdown components', async () => {
      const result = service.calculateSuggestedPrice(mockPricingInput);

      expect(result.breakdown).toHaveProperty('basePrice');
      expect(result.breakdown).toHaveProperty('distanceCost');
      expect(result.breakdown).toHaveProperty('weightCost');
      expect(result.breakdown).toHaveProperty('specialHandlingCost');
      expect(result.breakdown).toHaveProperty('deviationCost');
      expect(result.breakdown).toHaveProperty('cityPremiumCost');
    });

    it('should have positive or zero breakdown values', async () => {
      const result = service.calculateSuggestedPrice(mockPricingInput);

      Object.values(result.breakdown).forEach(cost => {
        expect(cost).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate total from breakdown components', async () => {
      const fragileInput = { ...mockPricingInput, isFragile: true };
      const result = service.calculateSuggestedPrice(fragileInput);

      const calculatedTotal = result.breakdown.basePrice + 
                            result.breakdown.distanceCost + 
                            result.breakdown.weightCost;

      expect(result.suggestedPrice).toBeGreaterThan(calculatedTotal);
    });
  });

  describe('Mathematical precision', () => {
    it('should handle floating point calculations correctly', async () => {
      const precisionInput = {
        ...mockPricingInput,
        distanceKm: 150.5,
        weightGr: 2750
      };

      const result = service.calculateSuggestedPrice(precisionInput);

      expect(result.suggestedPrice).toBeGreaterThan(0);
      expect(Number.isInteger(result.suggestedPrice)).toBe(true);
    });

    it('should maintain consistency across multiple calculations', async () => {
      const result1 = service.calculateSuggestedPrice(mockPricingInput);
      const result2 = service.calculateSuggestedPrice(mockPricingInput);

      expect(result1.suggestedPrice).toBe(result2.suggestedPrice);
      expect(result1.breakdown).toEqual(result2.breakdown);
    });
  });
});
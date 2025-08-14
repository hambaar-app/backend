import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PricingInput, PricingResult } from './pricing.types';

interface DistanceTier {
  minKm: number;
  maxKm: number;
  ratePerKm: number;
}

@Injectable()
export class PricingService {
  private readonly basePrice: number;
  private readonly fuelRate: number;
  private readonly weightBaseRate: number;
  private readonly platformCommission: number;
  private readonly driverShare: number;
  private readonly fragileMultiplier: number;
  private readonly perishableMultiplier: number;
  private readonly bothFragilePerishableMultiplier: number;
  private readonly majorCityOrigin: number;
  private readonly majorCityDestination: number;
  private readonly bothMajorCities: number;
  private readonly smallCityFactor: number;
  private readonly deviationRate: number;
  private readonly timeDeviationRate: number;
  private readonly majorCities: string[];
  private readonly distanceTiers: DistanceTier[];

  constructor(private configService: ConfigService) {
    // Base Constants (in Iranian Rial)
    this.basePrice = this.configService.get<number>('PRICING_BASE_PRICE', 50000);
    this.fuelRate = this.configService.get<number>('PRICING_FUEL_RATE', 200);
    this.weightBaseRate = this.configService.get<number>('PRICING_WEIGHT_BASE_RATE', 10000);
    this.driverShare = this.configService.get<number>('PRICING_DRIVER_SHARE', 0.7);
    this.platformCommission = 1 - this.driverShare;

    // Multipliers
    this.fragileMultiplier = this.configService.get<number>('PRICING_FRAGILE_MULTIPLIER', 1.25);
    this.perishableMultiplier = this.configService.get<number>('PRICING_PERISHABLE_MULTIPLIER', 1.35);
    this.bothFragilePerishableMultiplier = this.configService.get<number>('PRICING_BOTH_FRAGILE_PERISHABLE', 1.5);

    // City Premium Factors
    this.majorCityOrigin = this.configService.get<number>('PRICING_MAJOR_CITY_ORIGIN', 0.9);
    this.majorCityDestination = this.configService.get<number>('PRICING_MAJOR_CITY_DESTINATION', 1.3);
    this.bothMajorCities = this.configService.get<number>('PRICING_BOTH_MAJOR_CITIES', 1.0);
    this.smallCityFactor = this.configService.get<number>('PRICING_SMALL_CITY_FACTOR', 1.2);

    // Route Deviation Costs
    this.deviationRate = this.configService.get<number>('PRICING_DEVIATION_RATE', 15000);
    this.timeDeviationRate = this.configService.get<number>('PRICING_TIME_DEVIATION_RATE', 5000);

    // Major Cities List
    const majorCitiesString = this.configService.get<string>(
      'PRICING_MAJOR_CITIES', 'تهران,اصفهان,مشهد'
    );
    this.majorCities = majorCitiesString.split(',').map(city => city.trim());

    // Distance Pricing Tiers
    this.distanceTiers = [
      {
        minKm: 0,
        maxKm: 100,
        ratePerKm: this.configService.get<number>('PRICING_TIER_1_RATE', 1000)
      },
      {
        minKm: 101,
        maxKm: 300,
        ratePerKm: this.configService.get<number>('PRICING_TIER_2_RATE', 950)
      },
      {
        minKm: 301,
        maxKm: 600,
        ratePerKm: this.configService.get<number>('PRICING_TIER_3_RATE', 850)
      },
      {
        minKm: 601,
        maxKm: 1000,
        ratePerKm: this.configService.get<number>('PRICING_TIER_4_RATE', 750)
      },
      {
        minKm: 1001,
        maxKm: Infinity,
        ratePerKm: this.configService.get<number>('PRICING_TIER_5_RATE', 600)
      }
    ];
  }

  calculateSuggestedPrice(input: PricingInput): PricingResult {
    // Base components
    const basePrice = this.basePrice;
    const distanceCost = this.calculateDistanceCost(input.distanceKm);
    const weightCost = this.calculateWeightCost(input.weightKg);

    // Calculate subtotal before multipliers
    let subtotal = basePrice + distanceCost + weightCost;

    // Apply multipliers
    const specialMultiplier = this.calculateSpecialHandlingMultiplier(
      input.isFragile ?? false,
      input.isPerishable ?? false
    );
    subtotal *= specialMultiplier;

    // Apply city premium
    const cityPremium = this.calculateCityPremium(
      input.originCity,
      input.destinationCity
    );
    subtotal *= cityPremium;

    // Round final price
    const finalPrice = Math.round(subtotal / 1000) * 1000;

    return {
      suggestedPrice: Math.floor(finalPrice),
      transporterEarnings: Math.floor(finalPrice * this.driverShare),
      platformCommission: Math.floor(finalPrice * this.platformCommission),
      breakdown: {
        basePrice,
        distanceCost,
        weightCost,
        specialHandlingMultiplier: specialMultiplier,
        cityPremium,
      }
    };
  }

  // Calculate distance-based cost using tiered pricing
  calculateDistanceCost(distanceKm: number): number {
    let totalCost = this.fuelRate * distanceKm;
    let remainingDistance = distanceKm;

    for (const tier of this.distanceTiers) {
      if (remainingDistance <= 0) break;

      if (tier.maxKm === Infinity) {
        totalCost += remainingDistance * tier.ratePerKm;
        break;
      }

      const tierCapacity = tier.maxKm - tier.minKm + 1;
      const applicableDistance = Math.min(remainingDistance, tierCapacity);
      
      totalCost += applicableDistance * tier.ratePerKm;
      remainingDistance -= applicableDistance;
    }

    return totalCost;
  }

  // Calculate weight-based additional cost
  private calculateWeightCost(weightGr: number): number {
    if (weightGr < 500) {
      return 0; // No additional cost for packages ≤ 1kg
    }
    return (weightGr / 100) * this.weightBaseRate;
  }

  // Calculate special multipliers
  private calculateSpecialHandlingMultiplier(isFragile: boolean, isPerishable: boolean): number {
    if (isFragile && isPerishable) {
      return this.bothFragilePerishableMultiplier;
    } else if (isFragile) {
      return this.fragileMultiplier;
    } else if (isPerishable) {
      return this.perishableMultiplier;
    }
    return 1.0;
  }

  // Calculate deviation cost (Based on both distance and duration)
  calculateDeviationCost(additionalKm: number, additionalMinutes: number): number {
    const kmCost = additionalKm * this.deviationRate;
    const timeCost = additionalMinutes * this.timeDeviationRate;
    return kmCost + timeCost;
  }

  // Calculate city-based premium factor
  private calculateCityPremium(originCity: string, destinationCity: string): number {
    const originMajor = this.isMajorCity(originCity);
    const destMajor = this.isMajorCity(destinationCity);

    if (originMajor && destMajor) {
      return this.bothMajorCities;
    } else if (originMajor && !destMajor) {
      return this.majorCityOrigin;
    } else if (!originMajor && destMajor) {
      return this.majorCityDestination;
    } else {
      return this.smallCityFactor;
    }
  }

  // Check if a city is considered a major city
  private isMajorCity(cityName: string): boolean {
    return this.majorCities.some(city => 
      city.toLowerCase() === cityName.toLowerCase()
    );
  }
}

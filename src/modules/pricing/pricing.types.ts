export interface PricingInput {
  distanceKm: number;
  weightGr: number;
  isFragile?: boolean;
  isPerishable?: boolean;
  additionalKm?: number;
  additionalMinutes?: number;
  originCity: string;
  destinationCity: string;
}

export interface PriceBreakdown {
  basePrice: number;
  distanceCost: number;
  weightCost: number;
  specialHandlingCost: number;
  deviationCost?: number;
  cityPremiumCost: number;
}

export interface PricingResult {
  suggestedPrice: number;
  breakdown: PriceBreakdown;
}
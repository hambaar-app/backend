export interface PricingInput {
  distanceKm: number;
  weightKg: number;
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
  specialHandlingMultiplier: number;
  deviationCost?: number;
  cityPremium: number;
}

export interface PricingResult {
  suggestedPrice: number;
  transporterEarnings: number;
  platformCommission: number;
  breakdown: PriceBreakdown;
}
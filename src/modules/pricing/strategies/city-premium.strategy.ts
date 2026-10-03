/** Major-city premium factors, resolved per the legacy four-quadrant rule. */
export class CityPremiumStrategy {
  constructor(
    private readonly majorCityOrigin: number,
    private readonly majorCityDestination: number,
    private readonly bothMajorCities: number,
    private readonly smallCityFactor: number,
    private readonly majorCities: string[],
  ) {}

  calculate(originCity: string, destinationCity: string): number {
    const originMajor = this.isMajorCity(originCity);
    const destMajor = this.isMajorCity(destinationCity);

    if (originMajor && destMajor) {
      return this.bothMajorCities;
    }
    if (originMajor) {
      return this.majorCityOrigin;
    }
    if (destMajor) {
      return this.majorCityDestination;
    }
    return this.smallCityFactor;
  }

  /** Case-insensitive match against the configured `PRICING_MAJOR_CITIES`. */
  private isMajorCity(cityName: string): boolean {
    return this.majorCities.some(
      (city) => city.toLowerCase() === cityName.toLowerCase(),
    );
  }
}
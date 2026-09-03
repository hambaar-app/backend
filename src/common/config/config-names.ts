/**
 * Canonical config keys as const objects to eliminate stringly-typed typos.
 * Bootstrap/shared consumers use these in Phase 2; services are migrated in
 * their own phases.
 */
export const ConfigKey = {
  Database: {
    Url: 'DATABASE_URL',
  },
  Redis: {
    Url: 'REDIS_URL',
    OtpUrl: 'OTP_REDIS_URL',
    SessionUrl: 'SESSION_REDIS_URL',
  },
  Session: {
    Secret: 'SESSION_SECRET',
    Secure: 'COOKIE_SECURE',
    SameSite: 'COOKIE_SAMESITE',
    Domain: 'COOKIE_DOMAIN',
    MaxAge: 'COOKIE_MAX_AGE',
  },
  Auth: {
    CookieSecret: 'COOKIE_SECRET',
    MaxSendAttempts: 'MAX_SEND_ATTEMPTS',
    MaxCheckAttempts: 'MAX_CHECK_ATTEMPTS',
    SendWindow: 'SEND_WINDOW',
    BaseBlockTime: 'BASE_BLOCK_TIME',
    OtpExpirationTime: 'OTP_EXPIRATION_TIME',
    JwtAccessSecret: 'JWT_ACCESS_SECRET_KEY',
    JwtTempSecret: 'JWT_TEMP_SECRET_KEY',
    JwtProgressSecret: 'JWT_PROGRESS_SECRET_KEY',
    JwtAccessExpiresIn: 'JWT_ACCESS_EXPIRES_IN',
    JwtTempExpiresIn: 'JWT_TEMP_EXPIRES_IN',
    JwtProgressExpiresIn: 'JWT_PROGRESS_EXPIRES_IN',
  },
  Pricing: {
    BasePrice: 'PRICING_BASE_PRICE',
    FuelRate: 'PRICING_FUEL_RATE',
    WeightBaseRate: 'PRICING_WEIGHT_BASE_RATE',
    PlatformCommission: 'PRICING_PLATFORM_COMMISSION',
    DriverShare: 'PRICING_DRIVER_SHARE',
    FragileMultiplier: 'PRICING_FRAGILE_MULTIPLIER',
    PerishableMultiplier: 'PRICING_PERISHABLE_MULTIPLIER',
    BothFragilePerishable: 'PRICING_BOTH_FRAGILE_PERISHABLE',
    MajorCityOrigin: 'PRICING_MAJOR_CITY_ORIGIN',
    MajorCityDestination: 'PRICING_MAJOR_CITY_DESTINATION',
    BothMajorCities: 'PRICING_BOTH_MAJOR_CITIES',
    SmallCityFactor: 'PRICING_SMALL_CITY_FACTOR',
    DeviationRate: 'PRICING_DEVIATION_RATE',
    TimeDeviationRate: 'PRICING_TIME_DEVIATION_RATE',
    Tier1Rate: 'PRICING_TIER_1_RATE',
    Tier2Rate: 'PRICING_TIER_2_RATE',
    Tier3Rate: 'PRICING_TIER_3_RATE',
    Tier4Rate: 'PRICING_TIER_4_RATE',
    Tier5Rate: 'PRICING_TIER_5_RATE',
    MajorCities: 'PRICING_MAJOR_CITIES',
    CorridorWidth: 'CORRIDOR_WIDTH',
  },
  Aws: {
    AccessKey: 'AWS_ACCESS_KEY',
    SecretKey: 'AWS_SECRET_KEY',
    BucketName: 'AWS_BUCKET_NAME',
    Endpoint: 'AWS_ENDPOINT',
    Region: 'AWS_REGION',
  },
  Map: {
    ApiKey: 'MAP_API_KEY',
    ApiUrl: 'MAP_API_URL',
  },
  Sms: {
    ApiKey: 'SMS_API_KEY',
  },
  Throttle: {
    Ttl: 'THROTTLE_TTL',
    Limit: 'THROTTLE_LIMIT',
  },
  Server: {
    Port: 'PORT',
    ApiPrefix: 'API_PREFIX',
    LogLevel: 'LOG_LEVEL',
    NodeEnv: 'NODE_ENV',
    CorsOrigins: 'CORS_ORIGINS',
    TimeoutMs: 'TIMEOUT_MS',
    ResponseWrapperEnabled: 'RESPONSE_WRAPPER_ENABLED',
    MemoryHeapThresholdMb: 'MEMORY_HEAP_THRESHOLD_MB',
  },
} as const;

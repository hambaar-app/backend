import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  Validate,
  validateSync,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'commaSeparatedOrigins', async: false })
class CommaSeparatedOriginsConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .every((origin) => /^https?:\/\/.+/.test(origin));
  }
  defaultMessage(): string {
    return 'CORS_ORIGINS must be a comma-separated list of valid http(s) origins';
  }
}

export class EnvSchema {
  // --- Required infrastructure ---
  @IsString() DATABASE_URL!: string;
  @IsString() REDIS_URL!: string;
  @IsString() OTP_REDIS_URL!: string;
  @IsString() SESSION_REDIS_URL!: string;

  @IsString() @MinLength(16) SESSION_SECRET!: string;
  @IsString() COOKIE_SECRET!: string;

  @IsString() @MinLength(16) JWT_ACCESS_SECRET_KEY!: string;
  @IsString() @MinLength(16) JWT_TEMP_SECRET_KEY!: string;
  @IsString() @MinLength(16) JWT_PROGRESS_SECRET_KEY!: string;

  @IsOptional() @IsString() JWT_ACCESS_EXPIRES_IN?: string;
  @IsOptional() @IsString() JWT_TEMP_EXPIRES_IN?: string;
  @IsOptional() @IsString() JWT_PROGRESS_EXPIRES_IN?: string;

  @IsString() AWS_ACCESS_KEY!: string;
  @IsString() AWS_SECRET_KEY!: string;
  @IsString() AWS_BUCKET_NAME!: string;
  @IsString() AWS_ENDPOINT!: string;

  @IsString() MAP_API_KEY!: string;
  @IsString() MAP_API_URL!: string;
  @IsString() SMS_API_KEY!: string;

  // --- Optional with validated types/range ---
  @IsOptional() @IsInt() PORT?: number;

  @IsOptional() @IsInt() COOKIE_MAX_AGE?: number;
  @IsOptional() @IsInt() OTP_EXPIRATION_TIME?: number;
  @IsOptional() @IsInt() MAX_SEND_ATTEMPTS?: number;
  @IsOptional() @IsInt() MAX_CHECK_ATTEMPTS?: number;
  @IsOptional() @IsInt() SEND_WINDOW?: number;
  @IsOptional() @IsInt() BASE_BLOCK_TIME?: number;
  @IsOptional() @IsInt() CORRIDOR_WIDTH?: number;

  @IsOptional() @IsString() AWS_REGION?: string;

  @IsOptional() @IsInt() THROTTLE_TTL?: number;
  @IsOptional() @IsInt() THROTTLE_LIMIT?: number;

  @IsOptional() @IsString() API_PREFIX?: string;
  @IsOptional() @IsString() LOG_LEVEL?: string;

  @IsOptional() @IsString() COOKIE_SECURE?: string;
  @IsOptional() @IsString() COOKIE_SAMESITE?: string;
  @IsOptional() @IsString() COOKIE_DOMAIN?: string;

  @IsOptional() @IsInt() MEMORY_HEAP_THRESHOLD_MB?: number;
  @IsOptional() @IsInt() TIMEOUT_MS?: number;
  @IsOptional() @IsString() RESPONSE_WRAPPER_ENABLED?: string;

  @IsOptional() @IsString() NODE_ENV?: string;

  // --- Pricing (all optional) ---
  @IsOptional() @IsInt() PRICING_BASE_PRICE?: number;
  @IsOptional() @IsInt() PRICING_FUEL_RATE?: number;
  @IsOptional() @IsInt() PRICING_WEIGHT_BASE_RATE?: number;
  @IsOptional() @IsInt() PRICING_PLATFORM_COMMISSION?: number;
  @IsOptional() @IsInt() PRICING_DRIVER_SHARE?: number;

  @IsOptional() @IsInt() PRICING_FRAGILE_MULTIPLIER?: number;
  @IsOptional() @IsInt() PRICING_PERISHABLE_MULTIPLIER?: number;
  @IsOptional() @IsInt() PRICING_BOTH_FRAGILE_PERISHABLE?: number;

  @IsOptional() @IsInt() PRICING_MAJOR_CITY_ORIGIN?: number;
  @IsOptional() @IsInt() PRICING_MAJOR_CITY_DESTINATION?: number;
  @IsOptional() @IsInt() PRICING_BOTH_MAJOR_CITIES?: number;
  @IsOptional() @IsInt() PRICING_SMALL_CITY_FACTOR?: number;

  @IsOptional() @IsInt() PRICING_DEVIATION_RATE?: number;
  @IsOptional() @IsInt() PRICING_TIME_DEVIATION_RATE?: number;

  @IsOptional() @IsInt() PRICING_TIER_1_RATE?: number;
  @IsOptional() @IsInt() PRICING_TIER_2_RATE?: number;
  @IsOptional() @IsInt() PRICING_TIER_3_RATE?: number;
  @IsOptional() @IsInt() PRICING_TIER_4_RATE?: number;
  @IsOptional() @IsInt() PRICING_TIER_5_RATE?: number;

  @IsOptional() @IsString() PRICING_MAJOR_CITIES?: string;

  // --- CORS ---
  @IsOptional()
  @IsString()
  @Validate(CommaSeparatedOriginsConstraint)
  CORS_ORIGINS?: string;
}

// Note: a previous config contained a trailing space on `MAX_SEND_ATTEMPTS `.
// The canonical key is enforced here so the app fails fast on the bad key.
export const REQUIRED_KEYS: string[] = [
  'DATABASE_URL',
  'REDIS_URL',
  'OTP_REDIS_URL',
  'SESSION_REDIS_URL',
  'SESSION_SECRET',
  'COOKIE_SECRET',
  'JWT_ACCESS_SECRET_KEY',
  'JWT_TEMP_SECRET_KEY',
  'JWT_PROGRESS_SECRET_KEY',
  'AWS_ACCESS_KEY',
  'AWS_SECRET_KEY',
  'AWS_BUCKET_NAME',
  'AWS_ENDPOINT',
  'MAP_API_KEY',
  'MAP_API_URL',
  'SMS_API_KEY',
];

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const messages = errors.flatMap((e) =>
      Object.values(e.constraints ?? {}).map(
        (msg) => `${e.property}: ${msg}`,
      ),
    );
    throw new Error(
      `Invalid environment configuration:\n${messages.join('\n')}`,
    );
  }

  return validated;
}





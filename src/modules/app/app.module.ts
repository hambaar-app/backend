import { Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { APP_PIPE } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { S3Module } from '../s3/s3.module';
import { SupportModule } from '../support/support.module';
import { AddressModule } from '../address/address.module';
import { PackageModule } from '../package/package.module';
import { TripModule } from '../trip/trip.module';
import { FinancialModule } from '../financial/financial.module';
import { MapModule } from '../map/map.module';
import { HealthModule } from '../health/health.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificationModule } from '../notification/notification.module';
import { SessionModule } from '../../infra/session/session.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from '../../common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
      validate: validateEnv,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [
          createKeyv(config.getOrThrow<string>('REDIS_URL')),
          createKeyv(config.getOrThrow<string>('OTP_REDIS_URL')),
        ],
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),
    SessionModule,
    AuthModule,
    UserModule,
    DashboardModule,
    NotificationModule,
    VehicleModule,
    S3Module,
    AddressModule,
    PackageModule,
    TripModule,
    MapModule,
    FinancialModule,
    SupportModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
})
export class AppModule {}


import { MiddlewareConsumer, Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { APP_PIPE } from '@nestjs/core';
import { createClient } from 'redis';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
import { RedisStore } from 'connect-redis';
import { CookieNames } from 'src/common/enums/cookies.enum';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [
          createKeyv(config.getOrThrow<string>('REDIS_URL')),
          createKeyv(config.getOrThrow<string>('OTP_REDIS_URL')),
        ]
      })
    }),
    AuthModule,
    UserModule,
    DashboardModule,
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
      }),
    },
  ]
})
export class AppModule {
  constructor(
    private readonly config: ConfigService
  ) {}

  async configure(consumer: MiddlewareConsumer) {
    const redisClient = await createClient({
      url: this.config.getOrThrow<string>('SESSION_REDIS_URL')
    }).connect();

    consumer
      .apply(
        session({
          name: CookieNames.SessionId,
          secret: this.config.getOrThrow<string>('SESSION_SECRET'),
          resave: false,
          saveUninitialized: false,
          store: new RedisStore({
            client: redisClient,
            prefix: 'user-session'
          }),
          cookie: {
            httpOnly: true,
            // TODO: Fix this when you deploy on a https server
            // secure: process.env.NODE_ENV === 'production',
            secure: false,
            sameSite: 'strict',
            maxAge: this.config.get<number>('COOKIE_MAX_AGE', 15 * 24 * 3600 * 1000) // 15 days
          }
        }),
      ).forRoutes('*');
    
    consumer
      .apply(
        cookieParser(this.config.get<string>('COOKIE_SECRET'))
      ).forRoutes('*');
  }
}
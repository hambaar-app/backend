import { MiddlewareConsumer, Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { APP_PIPE } from '@nestjs/core';
import { createClient } from 'redis';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import cookieParser from 'cookie-parser';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    PrismaModule,
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        return {
          stores: [createKeyv(config.getOrThrow<string>('REDIS_URL'))]
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
      }),
    }
  ],
})
export class AppModule {
  constructor(
    private readonly config: ConfigService
  ) {}

  async configure(consumer: MiddlewareConsumer) {
    const redisClient = await createClient({
      url: this.config.getOrThrow<string>('REDIS_URL')
    }).connect();

    consumer
      .apply(
        session({
          // name: CookieNames.SessionId,
          secret: this.config.getOrThrow<string>('SESSION_SECRET'),
          resave: false,
          saveUninitialized: false,
          store: new RedisStore({
            client: redisClient,
            prefix: 'sess'
          }),
          cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
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
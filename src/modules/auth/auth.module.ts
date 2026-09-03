import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { CurrentUserMiddleware } from 'src/modules/user/current-user.middleware';
import { SmsModule } from '../sms/sms.module';
import { NotificationModule } from '../notification/notification.module';
import {
  OtpService,
  OTP_CACHE,
  OTP_CONFIG,
  OtpConfig,
} from './domain/otp.service';
import { TransporterSignupService } from './application/transporter-signup.service';
import { AuthStateMachine } from './domain/auth-state.machine';

@Module({
  imports: [
    PrismaModule,
    TokenModule,
    UserModule,
    VehicleModule,
    SmsModule,
    NotificationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TransporterSignupService,
    AuthStateMachine,
    {
      provide: OTP_CACHE,
      inject: [CACHE_MANAGER],
      useFactory: (cacheManager: Cache) => cacheManager.stores[1],
    },
    {
      provide: OTP_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService): OtpConfig => ({
        otpExpireTime: config.get<number>(
          'OTP_EXPIRATION_TIME',
          2 * 60 * 1000,
        ),
        maxSendAttempts: config.get<number>('MAX_SEND_ATTEMPTS', 5),
        maxCheckAttempts: config.get<number>('MAX_CHECK_ATTEMPTS', 10),
        sendWindow: config.get<number>('SEND_WINDOW', 30 * 60 * 1000),
        baseBlockTime: config.get<number>('BASE_BLOCK_TIME', 20 * 60 * 1000),
      }),
    },
  ],
})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CurrentUserMiddleware).forRoutes('auth/transporter/*');
  }
}

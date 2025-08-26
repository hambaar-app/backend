import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { CurrentUserMiddleware } from 'src/modules/user/current-user.middleware';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    PrismaModule,
    TokenModule,
    UserModule,
    VehicleModule,
    SmsModule
  ],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CurrentUserMiddleware)
      .forRoutes('auth/transporter/*');
  }
}

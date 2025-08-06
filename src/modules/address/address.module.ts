import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CurrentUserMiddleware } from 'src/modules/user/current-user.middleware';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PrismaModule,
    TokenModule,
    UserModule,
  ],
  providers: [AddressService],
  controllers: [AddressController],
  exports: [AddressService]
})
export class AddressModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CurrentUserMiddleware)
      .forRoutes('*');
  }
}

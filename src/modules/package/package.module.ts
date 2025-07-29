import { MiddlewareConsumer, Module } from '@nestjs/common';
import { PackageService } from './package.service';
import { PackageController } from './package.controller';
import { CurrentUserMiddleware } from 'src/common/current-user.middleware';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PrismaModule,
    TokenModule,
    UserModule,
  ],
  providers: [PackageService],
  controllers: [PackageController]
})
export class PackageModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CurrentUserMiddleware)
      .forRoutes('*');
  }
}

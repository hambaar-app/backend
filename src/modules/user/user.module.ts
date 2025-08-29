import { MiddlewareConsumer, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CurrentUserMiddleware } from 'src/modules/user/current-user.middleware';
import { TokenModule } from '../token/token.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    PrismaModule,
    TokenModule,
    S3Module,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CurrentUserMiddleware)
      .forRoutes('*');
  }
}

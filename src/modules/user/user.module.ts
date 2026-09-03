import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService, S3_STORAGE_PORT } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { S3Module } from '../s3/s3.module';
import { S3Service } from '../s3/s3.service';

@Module({
  imports: [PrismaModule, TokenModule, S3Module],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: S3_STORAGE_PORT,
      useExisting: S3Service,
    },
  ],
  exports: [UserService],
})
export class UserModule {}

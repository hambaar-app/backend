import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TokenService]
})
export class AuthModule {}

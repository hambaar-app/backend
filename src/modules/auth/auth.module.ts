import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenModule } from '../token/token.module';
import { UserService } from '../user/user.service';

@Module({
  imports: [
    TokenModule,
    UserService
  ],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}

import { Body, Controller, Post, Res, Session } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { CheckOtpDto } from './dto/check-otp.dto';
import { SessionData } from 'express-session';
import { CookieNames } from 'src/common/enums/cookies.enum';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthTokens } from 'src/common/enums/auth.enum';

@Controller('auth')
export class AuthController {
  private cookieMaxAge: number;

  constructor(
    private authService: AuthService,
    config: ConfigService
  ) {
    this.cookieMaxAge = config.get<number>('COOKIE_MAX_AGE', 15 * 24 * 3600 * 1000); // 15 days
  }

  @ApiOperation({
    summary: 'Sends OTP code to the user\'s phone number',
    description: `Sends a OTP code to the user's phone number or email for authentication for login or signup.
      This endpoint is used by both senders and transporters to verify their identity.`
  })
  @Post('send-otp')
  async sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body);
  }

  @ApiOperation({
    summary: 'Verifies OTP code for login or signup',
    description: `Verifies the OTP code sent to the user's phone number for authentication during login or signup.
      And set an 'access-token' in cookies.`
  })
  @Post('check-otp')
  async checkOtp(
    @Body() body: CheckOtpDto,
    @Session() session: SessionData,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, type } = await this.authService.checkOtp(body);
    
    if (type === AuthTokens.Access) {
      session.accessToken = token;
      res.cookie(CookieNames.AccessToken, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: this.cookieMaxAge,
      });
    } else if (type === AuthTokens.Temporary) {
      res.cookie(CookieNames.TemporaryToken, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: this.cookieMaxAge,
      });
    }

    return true;
  }
}

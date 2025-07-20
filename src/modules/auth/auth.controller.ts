import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  Session,
  UseGuards
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { CheckOtpDto, CheckOtpResponseDto } from './dto/check-otp.dto';
import { SessionData } from 'express-session';
import { CookieNames } from 'src/common/enums/cookies.enum';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthTokens } from 'src/common/enums/auth.enum';
import { SignupSenderDto } from './dto/signup-sender.dto';
import { TemporaryTokenGuard } from './guard/token.guard';
import { AuthMessages } from 'src/common/enums/messages.enum';
import { AlreadyAuthorizedGuard } from './guard/authorized.guard';

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
  @ApiTooManyRequestsResponse({
    description: AuthMessages.MaxAttempts
  })
  @ApiTooManyRequestsResponse({
    description: AuthMessages.TooManyAttempts
  })
  @UseGuards(AlreadyAuthorizedGuard)
  @HttpCode(HttpStatus.OK)
  @Post('send-otp')
  async sendOtp(@Body() body: SendOtpDto): Promise<boolean> {
    return this.authService.sendOtp(body);
  }

  @ApiOperation({
    summary: 'Verifies OTP code for login or signup',
    description: `Verifies the OTP code sent to the user's phone number for authentication during login or signup.`
  })
  @ApiTooManyRequestsResponse({
    description: AuthMessages.TooManyAttempts
  })
  @ApiUnauthorizedResponse({
    description: AuthMessages.OtpExpired
  })
  @ApiUnauthorizedResponse({
    description: AuthMessages.OtpInvalid
  })
  @HttpCode(HttpStatus.OK)
  @Post('check-otp')
  async checkOtp(
    @Body() body: CheckOtpDto,
    @Session() session: SessionData,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CheckOtpResponseDto> {
    const { token, type } = await this.authService.checkOtp(body);
    
    switch (type) {
      case AuthTokens.Access:
        session.accessToken = token;
        res.cookie(CookieNames.AccessToken, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: this.cookieMaxAge,
        });
        break;
    
      case AuthTokens.Temporary:
        res.cookie(CookieNames.TemporaryToken, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 20 * 60 * 1000,
        });
        break;
    }

    return {
      authenticated: type === AuthTokens.Access
    };
  }

  @ApiOperation({
    summary: 'Registers a sender user',
    description: `This endpoint registers a new sender user using the provided data,
      generates an access token and sets it as an cookie. Returns the created user.
      Protected by 'TemporaryGuard', that means you should authorized the phone number with otp before the request.`
  })
  @ApiBadRequestResponse({
    description: AuthMessages.UnauthorizedPhoneNumber
  })
  @ApiConflictResponse({
    description: 'Unique database constraint for => phoneNumber and email'
  })
  @UseGuards(TemporaryTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('sender/signup')
  async signupSender(
    @Body() body: SignupSenderDto,
    @Session() session: SessionData,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req.user?.phoneNumber !== body.phoneNumber) {
      throw new BadRequestException(AuthMessages.UnauthorizedPhoneNumber);
    }

    const { user, accessToken } = await this.authService.signupSender(body);

    session.accessToken = accessToken;
    res.cookie(CookieNames.AccessToken, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.cookieMaxAge,
    });

    res.clearCookie(CookieNames.TemporaryToken);
    
    return user;
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { CheckOtpDto } from './dto/check-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService
  ) {}

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
      The role parameter specifies the user role (sender or transporter) for signup.
      If the user is already registered, the role is ignored.`
  })
  @Post('check-otp')
  async checkOtp(@Body() body: CheckOtpDto) {
    return this.authService.checkOtp(body);
  }
}

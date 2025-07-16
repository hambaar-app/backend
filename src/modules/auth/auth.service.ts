import { Injectable } from '@nestjs/common';
import { SendOtpDto } from './dto/send-otp.dto';

@Injectable()
export class AuthService {
  async sendOtp({ phoneNumber }: SendOtpDto): Promise<true | never> {
    // call otp service method.
    return true;
  }
}

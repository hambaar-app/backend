import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SmsService {
  private otpApiKey: string;

  constructor(
    private httpService: HttpService,
    config: ConfigService,
  ) {
    this.otpApiKey = config.getOrThrow<string>('OTP_API_KEY');
  }

  async sendOtp(mobile: string, code: number) {
    try {
      const url = 'https://s.api.ir/api/sw1/SmsOTP';

      const response: AxiosResponse<{ success: boolean }> = await firstValueFrom(
        this.httpService.post(
          url,
          {
            mobile,
            code: String(code),
            template: 2
          }, 
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.otpApiKey}`,
            }
          }
        ),
      );

      return response.data.success;
    } catch (error) {
      throw new InternalServerErrorException('Failed to send otp code.');
    }
  }
}

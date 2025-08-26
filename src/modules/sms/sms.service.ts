import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SmsService {
  private smsApiKey: string;

  constructor(
    private httpService: HttpService,
    config: ConfigService,
  ) {
    this.smsApiKey = config.getOrThrow<string>('SMS_API_KEY');
  }

  async sendSms(mobiles: string[], message: string) {
    try {
      const url = 'https://s.api.ir/api/sw1/SendSms';

      const response: AxiosResponse<{ success: boolean }> = await firstValueFrom(
        this.httpService.post(
          url,
          {
            mobiles,
            message
          }, 
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.smsApiKey}`,
            }
          }
        ),
      );

      return response.data.success;
    } catch (error) {
      console.error('Failed to send sms.', error);      
      throw new InternalServerErrorException('Failed to send sms.');
    }
  }

  async sendOtp(mobile: string, code: number) {
//     const otpMessage = `
// کد تأیید هم‌بار: ${code}
// این کد برای ورود به حساب کاربری شماست. لطفاً آن را با کسی به اشتراک نگذارید.
// `;
//     return this.sendSms([mobile], otpMessage);

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
              'Authorization': `Bearer ${this.smsApiKey}`,
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

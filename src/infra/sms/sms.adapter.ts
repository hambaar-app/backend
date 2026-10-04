import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { SmsPort } from '../ports/ports';

const SEND_SMS_URL = 'https://s.api.ir/api/sw1/SendSms';
const SEND_OTP_URL = 'https://s.api.ir/api/sw1/SmsOTP';

/**
 * SMS adapter for s.api.ir (Phase 5 Task 1).
 *
 * Moved verbatim from `SmsService` (which is deleted — `OtpService` uses the
 * `PORTS.SMS` token now) with one documented deviation: a failed request is
 * **retried once** when the failure looks retryable (network error or HTTP
 * 5xx); 4xx failures and the retry failure throw the same
 * `InternalServerErrorException` messages as before. URLs, headers and
 * payloads are byte-identical to the legacy implementation.
 */
@Injectable()
export class SmsAdapter implements SmsPort {
  private readonly logger = new Logger(SmsAdapter.name);
  private smsApiKey: string;

  constructor(
    private httpService: HttpService,
    config: ConfigService,
  ) {
    this.smsApiKey = config.getOrThrow<string>('SMS_API_KEY');
  }

  async sendSms(mobiles: string[], message: string) {
    const data = await this.postWithRetryOnce<{ success: boolean }>(
      SEND_SMS_URL,
      { mobiles, message },
      'Failed to send sms.',
    );
    return data.success;
  }

  async sendOtp(mobile: string, code: string) {
    const data = await this.postWithRetryOnce<{ success: boolean }>(
      SEND_OTP_URL,
      { mobile, code, template: 2 },
      'Failed to send otp code.',
    );
    return data.success;
  }

  private async postWithRetryOnce<T>(
    url: string,
    payload: Record<string, unknown>,
    failMessage: string,
  ): Promise<T> {
    try {
      return await this.postOnce<T>(url, payload);
    } catch (error) {
      if (!isRetryableHttpError(error)) {
        this.logger.error(failMessage, error);
        throw new InternalServerErrorException(failMessage);
      }
      try {
        return await this.postOnce<T>(url, payload);
      } catch (retryError) {
        this.logger.error(failMessage, retryError);
        throw new InternalServerErrorException(failMessage);
      }
    }
  }

  private async postOnce<T>(
    url: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const response: AxiosResponse<T> = await firstValueFrom(
      this.httpService.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.smsApiKey}`,
        },
      }),
    );
    return response.data;
  }
}

/** Retryable = no HTTP response (network failure) or a 5xx status. */
function isRetryableHttpError(error: unknown): boolean {
  const status = axiosErrorShape(error).response?.status;
  return status === undefined || status >= 500;
}

/** Typed view over unknown axios failures (keeps `no-unsafe-*` quiet). */
function axiosErrorShape(error: unknown): {
  response?: { status?: number; data?: unknown };
} {
  if (typeof error === 'object' && error !== null) {
    const { response } = error as {
      response?: { status?: number; data?: unknown };
    };
    return { response };
  }
  return {};
}

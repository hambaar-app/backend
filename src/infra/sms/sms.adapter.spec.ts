import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { SmsAdapter } from './sms.adapter';

describe('SmsAdapter', () => {
  let adapter: SmsAdapter;
  let httpService: { post: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

  const successEnvelope = { data: { success: true } };

  beforeEach(() => {
    httpService = { post: jest.fn() };
    configService = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (key === 'SMS_API_KEY') return 'test-key';
        throw new Error(`unexpected key ${key}`);
      }),
    };

    adapter = new SmsAdapter(
      httpService as any,
      configService as unknown as ConfigService,
    );
  });

  describe('sendSms', () => {
    it('should post mobiles and message with bearer auth', async () => {
      httpService.post.mockReturnValue(of(successEnvelope));

      const result = await adapter.sendSms(['+98912'], 'hello');

      expect(result).toBe(true);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://s.api.ir/api/sw1/SendSms',
        { mobiles: ['+98912'], message: 'hello' },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          },
        },
      );
    });

    it('should retry once on 5xx then succeed', async () => {
      httpService.post
        .mockReturnValueOnce(throwError(() => ({ response: { status: 503 } })))
        .mockReturnValueOnce(of(successEnvelope));

      const result = await adapter.sendSms(['+98912'], 'hello');

      expect(result).toBe(true);
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });

    it('should retry once on network failure then throw the legacy message', async () => {
      httpService.post
        .mockReturnValueOnce(throwError(() => new Error('socket hang up')))
        .mockReturnValueOnce(throwError(() => new Error('socket hang up')));

      await expect(adapter.sendSms(['+98912'], 'hello')).rejects.toThrow(
        new InternalServerErrorException('Failed to send sms.'),
      );
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx', async () => {
      httpService.post.mockReturnValueOnce(
        throwError(() => ({ response: { status: 400 } })),
      );

      await expect(adapter.sendSms(['+98912'], 'hello')).rejects.toThrow(
        new InternalServerErrorException('Failed to send sms.'),
      );
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should retry non-object failures as retryable', async () => {
      httpService.post
        .mockReturnValueOnce(throwError(() => 'socket reset'))
        .mockReturnValueOnce(of(successEnvelope));

      const result = await adapter.sendSms(['+98912'], 'hello');

      expect(result).toBe(true);
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendOtp', () => {
    it('should post mobile, code and template 2', async () => {
      httpService.post.mockReturnValue(of(successEnvelope));

      const result = await adapter.sendOtp('+98912', '123456');

      expect(result).toBe(true);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://s.api.ir/api/sw1/SmsOTP',
        { mobile: '+98912', code: '123456', template: 2 },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          },
        },
      );
    });

    it('should not retry on 4xx', async () => {
      httpService.post.mockReturnValueOnce(
        throwError(() => ({ response: { status: 400 } })),
      );

      await expect(adapter.sendOtp('+98912', '123456')).rejects.toThrow(
        new InternalServerErrorException('Failed to send otp code.'),
      );
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should throw the legacy message when the retry is exhausted', async () => {
      httpService.post.mockReturnValue(
        throwError(() => ({ response: { status: 500 } })),
      );

      await expect(adapter.sendOtp('+98912', '123456')).rejects.toThrow(
        new InternalServerErrorException('Failed to send otp code.'),
      );
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });
  });
});

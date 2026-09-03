import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  AccessTokenGuard,
  ProgressTokenGuard,
  TemporaryTokenGuard,
} from './guard/token.guard';
import { DenyAuthorizedGuard } from './guard/deny-authorized.guard';
import { MultiTokenGuard } from './guard/multi-token.guard';
import { ConfigService } from '@nestjs/config';
import { CookieNames } from '../../common/enums/cookies.enum';
import { UserStatesEnum } from './types/auth.enums';

describe('AuthController', () => {
  let controller: AuthController;
  let service: DeepMockProxy<AuthService>;

  const session = () =>
    ({
      userId: undefined,
      phoneNumber: undefined,
      userState: undefined,
      accessToken: undefined,
      destroy: jest.fn(),
    }) as any;

  const res = () =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as any;

  beforeEach(async () => {
    service = mockDeep<AuthService>();
    const configService = mockDeep<ConfigService>();

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        NODE_ENV: 'development',
        COOKIE_MAX_AGE: 50000,
      };
      return config[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: ConfigService, useValue: configService },
      ],
    })
      .overrideGuard(TemporaryTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ProgressTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DenyAuthorizedGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(MultiTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('sendOtp', () => {
    it('should delegate to the service', async () => {
      service.sendOtp.mockResolvedValue(true);
      const body = { phoneNumber: '+989123456789' };

      const result = await controller.sendOtp(body);

      expect(service.sendOtp).toHaveBeenCalledWith(body);
      expect(result).toBe(true);
    });
  });

  describe('checkOtp', () => {
    const body = { phoneNumber: '+989123456789', code: '123456' };

    it('should set the access cookie and session for an access token', async () => {
      service.checkOtp.mockResolvedValue({
        isNewUser: false,
        userId: 'user-1',
        token: 'access-token',
        type: 'access',
        role: undefined,
      } as any);
      const ses = session();
      const resMock = res();

      const result = await controller.checkOtp(body, ses, resMock);

      expect(resMock.cookie).toHaveBeenCalledWith(
        CookieNames.AccessToken,
        'access-token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(ses.accessToken).toBe('access-token');
      expect(ses.userId).toBe('user-1');
      expect(ses.phoneNumber).toBe('+989123456789');
      expect(result).toEqual({ isNewUser: false });
    });

    it('should set the temporary cookie with a 20m maxAge', async () => {
      service.checkOtp.mockResolvedValue({
        isNewUser: true,
        token: 'temp-token',
        type: 'temp',
      } as any);

      const ses = session();
      const resMock = res();

      await controller.checkOtp(body, ses, resMock);

      expect(resMock.cookie).toHaveBeenCalledWith(
        CookieNames.TemporaryToken,
        'temp-token',
        expect.objectContaining({ maxAge: 20 * 60 * 1000 }),
      );
      expect(ses.accessToken).toBeUndefined();
      expect(ses.phoneNumber).toBe('+989123456789');
    });

    it('should set the progress cookie with the progress maxAge', async () => {
      service.checkOtp.mockResolvedValue({
        isNewUser: false,
        userId: 'user-1',
        token: 'progress-token',
        type: 'progress',
      } as any);

      const ses = session();
      const resMock = res();

      await controller.checkOtp(body, ses, resMock);

      expect(resMock.cookie).toHaveBeenCalledWith(
        CookieNames.ProgressToken,
        'progress-token',
        expect.objectContaining({ maxAge: 2 * 24 * 60 * 60 * 1000 }),
      );
      // Matches legacy behavior: the progress path does not clear the temp cookie
      expect(resMock.clearCookie).not.toHaveBeenCalled();
    });
  });

  describe('signupSender', () => {
    const body = {
      firstName: 'احمد',
      lastName: 'محمدی',
      phoneNumber: '+989123456789',
      gender: 'male',
    } as any;

    it('should reject a phone number mismatch', async () => {
      const ses = session();
      ses.phoneNumber = '+989000000000';

      await expect(controller.signupSender(body, ses, res())).rejects.toThrow(
        'Phone number in request does not match',
      );
    });

    it('should issue the access cookie and prime the session', async () => {
      service.signupSender.mockResolvedValue({
        sender: { id: 'user-1', phoneNumber: '+989123456789' },
        accessToken: 'access-token',
      } as any);
      const ses = session();
      ses.phoneNumber = '+989123456789';
      const resMock = res();

      const result = await controller.signupSender(body, ses, resMock);

      expect(resMock.cookie).toHaveBeenCalledWith(
        CookieNames.AccessToken,
        'access-token',
        expect.any(Object),
      );
      expect(resMock.clearCookie).toHaveBeenCalledWith(
        CookieNames.TemporaryToken,
      );
      expect(ses.userState).toBe(UserStatesEnum.Authenticated);
      expect(ses.userId).toBe('user-1');
      expect(result).toEqual({ id: 'user-1', phoneNumber: '+989123456789' });
    });
  });

  describe('signupTransporter', () => {
    const body = {
      firstName: 'احمد',
      lastName: 'محمدی',
      phoneNumber: '+989123456789',
      gender: 'male',
      birthDate: '1990-01-01',
      nationalId: '1234567890',
      licenseNumber: '0987654321',
      licenseType: 'grade_one',
      licenseExpiryDate: '2030-01-01',
    } as any;

    it('should reject a phone number mismatch', async () => {
      const ses = session();
      ses.phoneNumber = '+989000000000';

      await expect(
        controller.signupTransporter(body, ses, res()),
      ).rejects.toThrow('Phone number in request does not match');
    });

    it('should issue the progress cookie and set PersonalInfoSubmitted', async () => {
      service.signupTransporter.mockResolvedValue({
        transporter: { userId: 'user-1', phoneNumber: '+989123456789' },
        progressToken: 'progress-token',
      } as any);
      const ses = session();
      ses.phoneNumber = '+989123456789';
      const resMock = res();

      const result = await controller.signupTransporter(body, ses, resMock);

      expect(resMock.cookie).toHaveBeenCalledWith(
        CookieNames.ProgressToken,
        'progress-token',
        expect.any(Object),
      );
      expect(resMock.clearCookie).toHaveBeenCalledWith(
        CookieNames.TemporaryToken,
      );
      expect(ses.userState).toBe(UserStatesEnum.PersonalInfoSubmitted);
      expect(ses.userId).toBe('user-1');
      expect(result).toEqual({ userId: 'user-1', phoneNumber: '+989123456789' });
    });
  });

  describe('registerTransporterVehicle', () => {
    it('should delegate the vehicle creation to the service', async () => {
      const vehicle = { id: 'vehicle-1' };
      service.registerVehicle.mockResolvedValue(vehicle as any);
      const ses = session();
      const body = {} as any;

      const result = await controller.registerTransporterVehicle(
        body,
        ses,
        'user-1',
      );

      expect(service.registerVehicle).toHaveBeenCalledWith('user-1', body, ses);
      expect(result).toBe(vehicle);
    });
  });

  describe('submitTransporterDocumentKeys', () => {
    it('should issue the access cookie and clear the progress cookie', async () => {
      service.submitDocuments.mockResolvedValue({ accessToken: 'access-token' });
      const ses = session();
      const resMock = res();
      const user = { id: 'user-1', phoneNumber: '+989123456789' } as any;
      const body = {} as any;

      const result = await controller.submitTransporterDocumentKeys(
        body,
        ses,
        user,
        resMock,
      );

      expect(service.submitDocuments).toHaveBeenCalledWith(
        'user-1',
        '+989123456789',
        body,
      );
      expect(resMock.cookie).toHaveBeenCalledWith(
        CookieNames.AccessToken,
        'access-token',
        expect.any(Object),
      );
      expect(resMock.clearCookie).toHaveBeenCalledWith(
        CookieNames.ProgressToken,
      );
      expect(ses.accessToken).toBe('access-token');
      expect(result).toBe(true);
    });
  });

  describe('getUserState', () => {
    it('should delegate to the service', async () => {
      const state = { userState: UserStatesEnum.PersonalInfoSubmitted };
      service.getUserState.mockResolvedValue(state as any);
      const ses = session();

      const result = await controller.getUserState(ses);

      expect(service.getUserState).toHaveBeenCalledWith(ses);
      expect(result).toBe(state);
    });
  });

  describe('logoutUser', () => {
    it('should destroy the session and clear all auth cookies', async () => {
      const ses = session();
      const resMock = res();

      const result = await controller.logoutUser(ses, resMock);

      expect(ses.destroy).toHaveBeenCalled();
      expect(resMock.clearCookie).toHaveBeenCalledTimes(4);
      expect(resMock.clearCookie).toHaveBeenCalledWith(CookieNames.SessionId);
      expect(resMock.clearCookie).toHaveBeenCalledWith(
        CookieNames.TemporaryToken,
      );
      expect(resMock.clearCookie).toHaveBeenCalledWith(CookieNames.ProgressToken);
      expect(resMock.clearCookie).toHaveBeenCalledWith(CookieNames.AccessToken);
      expect(result).toBe(true);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AuthService } from './auth.service';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { VehicleService } from '../vehicle/vehicle.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { TooManyRequestsException } from '../../common/custom.exceptions';
import { AuthMessages, NotFoundMessages } from '../../common/enums/messages.enum';
import { AuthTokens } from '../../common/enums/auth.enum';
import { RolesEnum, VerificationStatusEnum, GendersEnum, LicenseTypeEnum, PrismaClient, } from '../../../generated/prisma';
import { UserStatesEnum } from './types/auth.enums';
import * as utilities from '../../common/utilities';
import { Keyv } from '@keyv/redis';

jest.mock('../../common/utilities', () => ({
  generateCode: jest.fn(() => 12345),
  formatPrismaError: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let tokenService: DeepMockProxy<TokenService>;
  let userService: DeepMockProxy<UserService>;
  let vehicleService: DeepMockProxy<VehicleService>;
  let prismaService: DeepMockProxy<PrismaClient>;
  let smsService: DeepMockProxy<SmsService>;
  let configService: DeepMockProxy<ConfigService>;
  let keyvMock: DeepMockProxy<Keyv>;

  const mockUser = {
    id: 'user-123',
    phoneNumber: '+989123456789',
    role: RolesEnum.sender,
  } as any;

  const mockTransporter = {
    id: 'trans-123',
    role: RolesEnum.transporter,
    vehicles: [{ 
      id: 'vehicle-123'
    }],
    verificationStatus: { status: VerificationStatusEnum.pending },
  } as any;

  const mockTransporterInProgress = {
    ...mockTransporter,
    vehicles: [],
    verificationStatus: { status: VerificationStatusEnum.pending },
    nationalIdDocumentKey: null,
    licenseDocumentKey: null,
  } as any;

  beforeEach(async () => {
    jest.resetAllMocks();

    tokenService = mockDeep<TokenService>();
    userService = mockDeep<UserService>();
    vehicleService = mockDeep<VehicleService>();
    prismaService = mockDeep<PrismaClient>();
    smsService = mockDeep<SmsService>();
    configService = mockDeep<ConfigService>();
    keyvMock = mockDeep<Keyv>();

    const cacheManager = { stores: [null, keyvMock] };

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        OTP_EXPIRATION_TIME: 120000,
        MAX_SEND_ATTEMPTS: 5,
        MAX_CHECK_ATTEMPTS: 10,
        SEND_WINDOW: 1800000,
        BASE_BLOCK_TIME: 1200000,
      };
      return config[key] || defaultValue;
    });

    // Reset utility mocks to default values
    (utilities.generateCode as jest.Mock).mockReturnValue(12345);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: TokenService, useValue: tokenService },
        { provide: UserService, useValue: userService },
        { provide: VehicleService, useValue: vehicleService },
        { provide: PrismaService, useValue: prismaService },
        { provide: SmsService, useValue: smsService },
        { provide: ConfigService, useValue: configService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('sendOtp', () => {
    it('should send OTP successfully', async () => {
      keyvMock.get.mockResolvedValue(null as any);
      keyvMock.set.mockResolvedValue(true);
      smsService.sendOtp.mockResolvedValue(true);

      const result = await service.sendOtp({ phoneNumber: '+989123456789' });

      expect(result).toBe(true);
      expect(smsService.sendOtp).toHaveBeenCalledWith('+989123456789', 12345);
    });

    it('should throw when user is blocked', async () => {
      const blockedData = {
        attempts: { blockedUntil: Date.now() + 600000, sendAttempts: 0, checkAttempts: 0, lastSendAttempt: 0 }
      };
      keyvMock.get.mockResolvedValue(blockedData as any);

      await expect(service.sendOtp({ phoneNumber: '+989123456789' })).rejects.toThrow(TooManyRequestsException);
    });

    it('should throw when max send attempts exceeded', async () => {
      const userData = {
        attempts: { sendAttempts: 5, checkAttempts: 0, lastSendAttempt: Date.now() - 60000 }
      };
      keyvMock.get.mockResolvedValue(userData as any);

      await expect(service.sendOtp({ phoneNumber: '+989123456789' })).rejects.toThrow(TooManyRequestsException);
    });

    it('should throw when OTP not expired', async () => {
      const userData = {
        otp: { expiresIn: Date.now() + 60000 },
        attempts: { sendAttempts: 1, checkAttempts: 0, lastSendAttempt: Date.now() - 60000 }
      };
      keyvMock.get.mockResolvedValue(userData as any);

      await expect(service.sendOtp({ phoneNumber: '+989123456789' })).rejects.toThrow(
        new UnauthorizedException(AuthMessages.OtpNotExpired)
      );
    });
  });

  describe('checkOtp', () => {
    const now = Date.now();

    it('should verify OTP for new user', async () => {
      const validOtpData = {
        otp: { code: 12345, expiresIn: now + 60000, createdAt: now - 60000 },
        attempts: { sendAttempts: 1, checkAttempts: 0, lastSendAttempt: now - 60000 }
      };
      keyvMock.get.mockResolvedValue(validOtpData as any);
      keyvMock.set.mockResolvedValue(true);
      userService.getByPhoneNumber.mockResolvedValue(null);
      (tokenService['generateTempToken'] as jest.Mock).mockReturnValue('temp-token');

      const result = await service.checkOtp({ phoneNumber: '+989123456789', code: validOtpData.otp.code });

      expect(result).toEqual({
        isNewUser: true,
        token: 'temp-token',
        type: AuthTokens.Temporary,
      });
    });

    it('should verify OTP for existing sender', async () => {
      const validOtpData = {
        otp: { code: 12345, expiresIn: now + 60000, createdAt: now - 60000 },
        attempts: { sendAttempts: 1, checkAttempts: 0, lastSendAttempt: now - 60000 }
      };
      keyvMock.get.mockResolvedValue(validOtpData as any);
      keyvMock.set.mockResolvedValue(true);
      userService.getByPhoneNumber.mockResolvedValue(mockUser);
      (tokenService['generateAccessToken'] as jest.Mock).mockReturnValue('access-token');

      const result = await service.checkOtp({ phoneNumber: '+989123456789', code: validOtpData.otp.code });

      expect(result).toEqual({
        isNewUser: false,
        userId: 'user-123',
        role: RolesEnum.sender,
        token: 'access-token',
        type: AuthTokens.Access,
        userState: UserStatesEnum.Authenticated,
      });
    });

    it('should handle transporter in progress', async () => {
      const validOtpData = {
        otp: { code: 12345, expiresIn: now + 60000, createdAt: now - 60000 },
        attempts: { sendAttempts: 1, checkAttempts: 0, lastSendAttempt: now - 60000 }
      };
      keyvMock.get.mockResolvedValue(validOtpData as any);
      keyvMock.set.mockResolvedValue(true);
      userService.getByPhoneNumber.mockResolvedValue({ ...mockUser, role: RolesEnum.transporter });
      userService.getTransporter.mockResolvedValue(mockTransporterInProgress);
      (tokenService['generateProgressToken'] as jest.Mock).mockReturnValue('progress-token');

      const result = await service.checkOtp({ phoneNumber: '+989123456789', code: validOtpData.otp.code });

      expect(result.type).toBe(AuthTokens.Progress);
      expect(result.userState).toBe(UserStatesEnum.PersonalInfoSubmitted);
    });

    it('should throw when OTP expired', async () => {
      const expiredData = {
        otp: { code: 12345, expiresIn: now - 60000 },
        attempts: { sendAttempts: 1, checkAttempts: 0, lastSendAttempt: now - 60000 }
      };
      keyvMock.get.mockResolvedValue(expiredData as any);

      await expect(service.checkOtp({ phoneNumber: '+989123456789', code: 12345 })).rejects.toThrow(
        new UnauthorizedException(AuthMessages.OtpExpired)
      );
    });

    it('should throw when invalid OTP code', async () => {
      const validOtpData = {
        otp: { code: 12345, expiresIn: now + 60000, createdAt: now - 60000 },
        attempts: { sendAttempts: 1, checkAttempts: 0, lastSendAttempt: now - 60000 }
      };
      keyvMock.get.mockResolvedValue(validOtpData as any);
      keyvMock.set.mockResolvedValue(true);

      await expect(service.checkOtp({ phoneNumber: '+989123456789', code: 54321 })).rejects.toThrow(
        new UnauthorizedException(AuthMessages.OtpInvalid)
      );
    });
  });

  describe('signupSender', () => {
    const senderDto = {
      firstName: 'احمد',
      lastName: 'محمدی',
      phoneNumber: '+989123456789',
      gender: GendersEnum.male,
    };

    it('should create sender successfully', async () => {
      prismaService.user.create.mockResolvedValue(mockUser);
      (tokenService['generateAccessToken'] as jest.Mock).mockReturnValue('access-token');

      const result = await service.signupSender(senderDto);

      expect(result).toEqual({
        sender: mockUser,
        accessToken: 'access-token',
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...senderDto,
          wallet: { create: {} },
          role: RolesEnum.sender,
          phoneVerifiedAt: expect.any(Date),
        },
      });
    });
  });

  describe('signupTransporter', () => {
    const transporterDto = {
      firstName: 'علی',
      lastName: 'احمدی',
      phoneNumber: '+989123456789',
      gender: GendersEnum.male,
      birthDate: new Date('1985-01-01'),
      nationalId: '1234567890',
      licenseNumber: '0987654321',
      licenseType: LicenseTypeEnum.grade_one,
      licenseExpiryDate: new Date('2025-12-31'),
    };

    it('should create transporter successfully', async () => {
      const createdTransporter = {
        ...mockUser,
        role: RolesEnum.transporter,
        transporter: mockTransporter,
      };
      prismaService.user.create.mockResolvedValue(createdTransporter);
      (tokenService['generateProgressToken'] as jest.Mock).mockReturnValue('progress-token');

      const result = await service.signupTransporter(transporterDto);

      expect(result.progressToken).toBe('progress-token');
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: RolesEnum.transporter,
          transporter: {
            create: expect.objectContaining({
              nationalId: '1234567890',
              licenseNumber: '0987654321',
            }),
          },
        }),
        include: { transporter: true },
      });
    });
  });

  describe('submitDocuments', () => {
    it('should submit documents successfully', async () => {
      const documentsDto = {
        nationalIdDocumentKey: 'national-id-key',
        licenseDocumentKey: 'license-key',
        registrationCardKey: 'reg-card-key',
        insuranceDocumentKey: 'insurance-key',
        technicalInspectionKey: 'tech-key',
        greenSheetKey: 'green-sheet-key',
        cardKey: 'card-key',
        vehiclePicsKey: ['vehicle-pics-key'],
      };
      
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      userService.getTransporter.mockResolvedValue(mockTransporter);
      (tokenService['generateAccessToken'] as jest.Mock).mockReturnValue('access-token');

      const result = await service.submitDocuments('user-123', '+989123456789', documentsDto);

      expect(result.accessToken).toBe('access-token');
      expect(userService.updateTransporter).toHaveBeenCalled();
      expect(vehicleService.update).toHaveBeenCalledWith('vehicle-123', expect.any(Object), prismaService);
    });
  });

  describe('getUserState', () => {
    it('should return cached authenticated state', async () => {
      const session = { userState: UserStatesEnum.Authenticated } as any;

      const result = await service.getUserState(session);

      expect(result).toEqual({ userState: UserStatesEnum.Authenticated });
    });

    it('should compute initial state for sender', async () => {
      const session = { userId: 'user-123' } as any;
      userService.get.mockResolvedValue(mockUser);

      const result = await service.getUserState(session);

      expect(result).toEqual({
        userState: UserStatesEnum.Authenticated,
        role: RolesEnum.sender,
      });
      expect(session.userState).toBe(UserStatesEnum.Authenticated);
    });

    it('should compute state for transporter', async () => {
      const session = { userId: 'trans-123' } as any;
      userService.get.mockResolvedValue({ ...mockUser, role: RolesEnum.transporter });
      userService.getTransporter.mockResolvedValue(mockTransporterInProgress);

      const result = await service.getUserState(session);

      expect(result?.userState).toBe(UserStatesEnum.PersonalInfoSubmitted);
      expect(result?.role).toBe(RolesEnum.transporter);
    });

    it('should throw when user not found', async () => {
      const session = { userId: 'missing-user' } as any;
      userService.get.mockResolvedValue(null);

      await expect(service.getUserState(session)).rejects.toThrow(
        new NotFoundException(NotFoundMessages.User)
      );
    });
  });

  describe('computeTransporterState', () => {
    it('should return PersonalInfoSubmitted when no vehicles', async () => {
      userService.getTransporter.mockResolvedValue(mockTransporterInProgress);

      const result = await service['computeTransporterState']('trans-123');

      expect(result.userState).toBe(UserStatesEnum.PersonalInfoSubmitted);
    });

    it('should return VehicleInfoSubmitted when vehicle exists', async () => {
      userService.getTransporter.mockResolvedValue({
        ...mockTransporter,
        vehicles: [{ verificationDocuments: null }],
        nationalIdDocumentKey: null,
        licenseDocumentKey: null,
      });

      const result = await service['computeTransporterState']('trans-123');

      expect(result.userState).toBe(UserStatesEnum.VehicleInfoSubmitted);
    });

    it('should return DocumentsSubmitted when all docs exist', async () => {
      userService.getTransporter.mockResolvedValue({
        ...mockTransporter,
        vehicles: [{ verificationDocuments: { some: 'data' } }],
        nationalIdDocumentKey: 'national-key',
        licenseDocumentKey: 'license-key',
      });

      const result = await service['computeTransporterState']('trans-123');

      expect(result.userState).toBe(UserStatesEnum.DocumentsSubmitted);
    });

    it('should return Authenticated when verified', async () => {
      userService.getTransporter.mockResolvedValue({
        ...mockTransporter,
        verificationStatus: { status: VerificationStatusEnum.verified },
      });

      const result = await service['computeTransporterState']('trans-123');

      expect(result.userState).toBe(UserStatesEnum.Authenticated);
    });
  });

  describe('Error scenarios', () => {
    it('should handle missing OTP', async () => {
      keyvMock.get.mockResolvedValue({ attempts: { sendAttempts: 0, checkAttempts: 0, lastSendAttempt: 0 } } as any);

      await expect(service.checkOtp({ phoneNumber: '+989123456789', code: 12345 })).rejects.toThrow(
        new UnauthorizedException(AuthMessages.OtpExpired)
      );
    });

    it('should block after max check attempts', async () => {
      const userData = {
        otp: { code: 54321, expiresIn: Date.now() + 60000 },
        attempts: { sendAttempts: 1, checkAttempts: 10, lastSendAttempt: Date.now() - 60000 }
      };
      keyvMock.get.mockResolvedValue(userData as any);
      keyvMock.set.mockResolvedValue(true);

      await expect(service.checkOtp({ phoneNumber: '+989123456789', code: 12345 })).rejects.toThrow(TooManyRequestsException);
    });

    it('should handle Prisma errors', async () => {
      const error = new Error('DB error');
      prismaService.user.create.mockRejectedValue(error);
      ((utilities.formatPrismaError as unknown) as jest.Mock).mockImplementation(() => {
        throw new Error('Formatted error');
      });

      await expect(service.signupSender({
        firstName: 'احمد',
        lastName: 'محمدی',
        phoneNumber: '+989123456789',
        gender: GendersEnum.male,
      })).rejects.toThrow('Formatted error');
    });
  });
});
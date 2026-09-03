import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { TransporterSignupService } from './transporter-signup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../../token/token.service';
import { NotificationService } from '../../notification/notification.service';
import { PrismaClient, RolesEnum, GendersEnum, LicenseTypeEnum } from '../../../../generated/prisma';
import { NotificationMessages } from '../../notification/notification-messages';

describe('TransporterSignupService', () => {
  let service: TransporterSignupService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let tokenService: DeepMockProxy<TokenService>;
  let notificationService: DeepMockProxy<NotificationService>;

  const senderDto = {
    firstName: 'احمد',
    lastName: 'محمدی',
    phoneNumber: '+989123456789',
    gender: GendersEnum.male,
  };

  const transporterDto = {
    firstName: 'احمد',
    lastName: 'محمدی',
    phoneNumber: '+989123456789',
    gender: GendersEnum.male,
    birthDate: new Date('1990-01-01'),
    nationalId: '1234567890',
    licenseNumber: '0987654321',
    licenseType: LicenseTypeEnum.grade_one,
    licenseExpiryDate: new Date('2030-01-01'),
  };

  const mockSender = {
    id: 'user-1',
    phoneNumber: '+989123456789',
    role: RolesEnum.sender,
  };

  const mockTransporterUser = {
    id: 'user-2',
    phoneNumber: '+989123456789',
    role: RolesEnum.transporter,
    transporter: {
      id: 'trans-2',
      nationalId: '1234567890',
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    prismaService = mockDeep<PrismaClient>();
    tokenService = mockDeep<TokenService>();
    notificationService = mockDeep<NotificationService>();
    notificationService.create.mockResolvedValue({} as any);

    prismaService.$transaction.mockImplementation(
      async (callback) => callback(prismaService),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransporterSignupService,
        { provide: PrismaService, useValue: prismaService },
        { provide: TokenService, useValue: tokenService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<TransporterSignupService>(TransporterSignupService);
  });

  describe('signupSender', () => {
    it('should create the sender with a wallet, issue an access token and welcome notification', async () => {
      prismaService.user.create.mockResolvedValue(mockSender as any);
      tokenService.generateAccessToken.mockReturnValue('access-token');

      const result = await service.signupSender(senderDto);

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: RolesEnum.sender,
            wallet: { create: {} },
            phoneVerifiedAt: expect.any(Date),
          }),
        }),
      );
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        sub: 'user-1',
        phoneNumber: '+989123456789',
      });
      expect(notificationService.create).toHaveBeenCalledWith(
        'user-1',
        { content: NotificationMessages.Welcome },
        prismaService,
      );
      expect(result).toEqual({
        sender: mockSender,
        accessToken: 'access-token',
      });
    });

    it('should propagate constraint failures without wrapping', async () => {
      const error = new Error('P2002 unique constraint');
      prismaService.user.create.mockRejectedValue(error);

      await expect(service.signupSender(senderDto)).rejects.toThrow(
        'P2002 unique constraint',
      );
    });
  });

  describe('signupTransporter', () => {
    it('should create the transporter with statuses, issue a progress token and welcome notification', async () => {
      prismaService.user.create.mockResolvedValue(mockTransporterUser as any);
      tokenService.generateProgressToken.mockReturnValue('progress-token');

      const result = await service.signupTransporter(transporterDto);

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: RolesEnum.transporter,
            transporter: {
              create: expect.objectContaining({
                nationalId: '1234567890',
                nationalIdStatus: { create: {} },
                licenseStatus: { create: {} },
                verificationStatus: { create: {} },
              }),
            },
          }),
        }),
      );
      expect(tokenService.generateProgressToken).toHaveBeenCalledWith({
        sub: 'user-2',
        phoneNumber: '+989123456789',
      });
      expect(notificationService.create).toHaveBeenCalledWith(
        'user-2',
        { content: NotificationMessages.Welcome },
        prismaService,
      );
      expect(result.progressToken).toBe('progress-token');
      expect(result.transporter.id).toBe('trans-2');
      expect(result.transporter.nationalId).toBe('1234567890');
    });

    it('should propagate constraint failures without wrapping', async () => {
      const error = new Error('P2002 unique constraint');
      prismaService.user.create.mockRejectedValue(error);

      await expect(
        service.signupTransporter(transporterDto),
      ).rejects.toThrow('P2002 unique constraint');
    });
  });
});
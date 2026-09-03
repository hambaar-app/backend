import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AuthService } from './auth.service';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { VehicleService } from '../vehicle/vehicle.service';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './domain/otp.service';
import { TransporterSignupService } from './application/transporter-signup.service';
import { AuthStateMachine } from './domain/auth-state.machine';
import {
  RolesEnum,
  VerificationStatusEnum,
  GendersEnum,
} from '../../../generated/prisma';
import { AuthTokens } from '../../common/enums/auth.enum';
import { NotFoundMessages } from '../../common/enums/messages.enum';
import { UserStatesEnum } from './types/auth.enums';

describe('AuthService', () => {
  let service: AuthService;
  let tokenService: DeepMockProxy<TokenService>;
  let userService: DeepMockProxy<UserService>;
  let vehicleService: DeepMockProxy<VehicleService>;
  let prismaService: DeepMockProxy<PrismaService>;
  let otpService: DeepMockProxy<OtpService>;
  let signupService: DeepMockProxy<TransporterSignupService>;
  let stateMachine: DeepMockProxy<AuthStateMachine>;

  const mockSender = {
    id: 'user-123',
    phoneNumber: '+989123456789',
    role: RolesEnum.sender,
  } as any;

  const mockTransporter = {
    id: 'user-456',
    phoneNumber: '+989876543210',
    role: RolesEnum.transporter,
    firstName: 'احمد',
    lastName: 'محمدی',
    vehicles: [],
    verificationStatus: { status: VerificationStatusEnum.pending },
  } as any;

  const mockVehicle = { id: 'vehicle-1' } as any;

  const signupSenderDto = {
    firstName: 'احمد',
    lastName: 'محمدی',
    phoneNumber: '+989123456789',
    gender: GendersEnum.male,
  };

  const signupTransporterDto = {
    firstName: 'احمد',
    lastName: 'محمدی',
    phoneNumber: '+989876543210',
    gender: GendersEnum.male,
    birthDate: new Date('1990-01-01'),
    nationalId: '1234567890',
    licenseNumber: '0987654321',
    licenseType: 'grade_one' as any,
    licenseExpiryDate: new Date('2030-01-01'),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    tokenService = mockDeep<TokenService>();
    userService = mockDeep<UserService>();
    vehicleService = mockDeep<VehicleService>();
    prismaService = mockDeep<PrismaService>();
    otpService = mockDeep<OtpService>();
    signupService = mockDeep<TransporterSignupService>();
    stateMachine = mockDeep<AuthStateMachine>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: TokenService, useValue: tokenService },
        { provide: UserService, useValue: userService },
        { provide: VehicleService, useValue: vehicleService },
        { provide: PrismaService, useValue: prismaService },
        { provide: OtpService, useValue: otpService },
        { provide: TransporterSignupService, useValue: signupService },
        { provide: AuthStateMachine, useValue: stateMachine },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('sendOtp', () => {
    it('should delegate to OtpService', async () => {
      otpService.sendOtp.mockResolvedValue(true);

      const result = await service.sendOtp({
        phoneNumber: '+989123456789',
      });

      expect(result).toBe(true);
      expect(otpService.sendOtp).toHaveBeenCalledWith('+989123456789');
    });
  });

  describe('checkOtp', () => {
    it('should issue a temp token for a new user', async () => {
      otpService.verify.mockResolvedValue(undefined);
      userService.getByPhoneNumber.mockResolvedValue(null);
      tokenService.generateTempToken.mockReturnValue('temp-token');

      const result = await service.checkOtp({
        phoneNumber: '+989123456789',
        code: '123456',
      });

      expect(otpService.verify).toHaveBeenCalledWith(
        '+989123456789',
        '123456',
      );
      expect(tokenService.generateTempToken).toHaveBeenCalledWith({
        phoneNumber: '+989123456789',
      });
      expect(result).toEqual({
        isNewUser: true,
        token: 'temp-token',
        type: AuthTokens.Temporary,
      });
    });

    it('should issue an access token with Authenticated state for an existing sender', async () => {
      otpService.verify.mockResolvedValue(undefined);
      userService.getByPhoneNumber.mockResolvedValue(mockSender);
      tokenService.generateAccessToken.mockReturnValue('access-token');

      const result = await service.checkOtp({
        phoneNumber: '+989123456789',
        code: '123456',
      });

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        sub: 'user-123',
        phoneNumber: '+989123456789',
      });
      expect(result).toMatchObject({
        isNewUser: false,
        userId: 'user-123',
        type: AuthTokens.Access,
        token: 'access-token',
        userState: UserStatesEnum.Authenticated,
      });
    });

    it('should issue a progress token for a transporter in progress', async () => {
      otpService.verify.mockResolvedValue(undefined);
      userService.getByPhoneNumber.mockResolvedValue(mockTransporter);
      userService.getTransporter.mockResolvedValue(mockTransporter as any);
      stateMachine.compute.mockReturnValue({
        userState: UserStatesEnum.PersonalInfoSubmitted,
        transporter: mockTransporter,
      });
      tokenService.generateProgressToken.mockReturnValue('progress-token');

      const result = await service.checkOtp({
        phoneNumber: '+989876543210',
        code: '123456',
      });

      expect(stateMachine.compute).toHaveBeenCalled();
      expect(tokenService.generateProgressToken).toHaveBeenCalledWith({
        sub: 'user-456',
        phoneNumber: '+989876543210',
      });
      expect(result).toMatchObject({
        type: AuthTokens.Progress,
        token: 'progress-token',
        userState: UserStatesEnum.PersonalInfoSubmitted,
      });
    });

    it('should keep the access token for a transporter in DocumentsSubmitted', async () => {
      otpService.verify.mockResolvedValue(undefined);
      userService.getByPhoneNumber.mockResolvedValue(mockTransporter);
      userService.getTransporter.mockResolvedValue(mockTransporter as any);
      stateMachine.compute.mockReturnValue({
        userState: UserStatesEnum.DocumentsSubmitted,
        transporter: mockTransporter,
      });
      tokenService.generateAccessToken.mockReturnValue('access-token');

      const result = await service.checkOtp({
        phoneNumber: '+989876543210',
        code: '123456',
      });

      expect(result).toMatchObject({
        type: AuthTokens.Access,
        token: 'access-token',
        userState: UserStatesEnum.DocumentsSubmitted,
      });
    });
  });

  describe('signupSender / signupTransporter', () => {
    it('should delegate signupSender', async () => {
      const expected = { sender: mockSender, accessToken: 't' };
      signupService.signupSender.mockResolvedValue(expected as any);

      const result = await service.signupSender(signupSenderDto);

      expect(signupService.signupSender).toHaveBeenCalledWith(signupSenderDto);
      expect(result).toBe(expected);
    });

    it('should delegate signupTransporter', async () => {
      const expected = { transporter: {}, progressToken: 't' };
      signupService.signupTransporter.mockResolvedValue(expected as any);

      const result = await service.signupTransporter(signupTransporterDto);

      expect(signupService.signupTransporter).toHaveBeenCalledWith(
        signupTransporterDto,
      );
      expect(result).toBe(expected);
    });
  });

  describe('submitDocuments', () => {
    const body = {
      nationalIdDocumentKey: 'transporter/user-456/national-id-1',
      licenseDocumentKey: 'transporter/user-456/license-1',
      greenSheetKey: 'transporter/user-456/vehicle/green-sheet-1',
      cardKey: 'transporter/user-456/vehicle/card-1',
      vehiclePicsKey: ['transporter/user-456/vehicle/pic-1'],
    };

    it('should update both transporter and vehicle in one transaction and issue an access token', async () => {
      prismaService.$transaction.mockImplementation(
        async (callback) => callback(prismaService),
      );
      userService.getTransporter.mockResolvedValue({
        vehicles: [{ id: 'vehicle-1' }],
      } as any);
      tokenService.generateAccessToken.mockReturnValue('access-token');

      const result = await service.submitDocuments(
        'user-456',
        '+989876543210',
        body,
      );

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(userService.updateTransporter).toHaveBeenCalledWith(
        'user-456',
        {
          nationalIdDocumentKey: 'transporter/user-456/national-id-1',
          licenseDocumentKey: 'transporter/user-456/license-1',
        },
        prismaService,
      );
      expect(userService.getTransporter).toHaveBeenCalledWith(
        { userId: 'user-456' },
        prismaService,
      );
      expect(vehicleService.update).toHaveBeenCalledWith(
        'vehicle-1',
        {
          verificationDocuments: {
            greenSheetKey: 'transporter/user-456/vehicle/green-sheet-1',
            cardKey: 'transporter/user-456/vehicle/card-1',
            vehiclePicsKey: ['transporter/user-456/vehicle/pic-1'],
          },
        },
        prismaService,
      );
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        sub: 'user-456',
        phoneNumber: '+989876543210',
      });
      expect(result).toEqual({ accessToken: 'access-token' });
    });

    it('should propagate transaction failures (rollback handled by Prisma)', async () => {
      const error = new Error('update failed');
      prismaService.$transaction.mockRejectedValue(error);

      await expect(
        service.submitDocuments('user-456', '+989876543210', body),
      ).rejects.toThrow('update failed');
    });
  });

  describe('registerVehicle', () => {
    it('should create the vehicle and set the session state', async () => {
      vehicleService.create.mockResolvedValue(mockVehicle);
      const session = { userState: undefined } as any;

      const result = await service.registerVehicle(
        'user-456',
        {} as any,
        session,
      );

      expect(vehicleService.create).toHaveBeenCalledWith('user-456', {});
      expect(result).toBe(mockVehicle);
      expect(session.userState).toBe(UserStatesEnum.VehicleInfoSubmitted);
    });
  });

  describe('getUserState', () => {
    const session = (overrides: Record<string, unknown> = {}) =>
      ({
        userId: 'user-123',
        phoneNumber: '+989123456789',
        userState: undefined,
        ...overrides,
      }) as any;

    it('should return the cached Authenticated state without DB access', async () => {
      const result = await service.getUserState(
        session({ userState: UserStatesEnum.Authenticated }),
      );

      expect(result).toEqual({ userState: UserStatesEnum.Authenticated });
      expect(userService.get).not.toHaveBeenCalled();
    });

    it('should throw NotFound when the user is missing for a cached non-authenticated state', async () => {
      userService.get.mockResolvedValue(null);

      await expect(
        service.getUserState(
          session({ userState: UserStatesEnum.PersonalInfoSubmitted }),
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getUserState(
          session({ userState: UserStatesEnum.PersonalInfoSubmitted }),
        ),
      ).rejects.toThrow(NotFoundMessages.User);
    });

    it('should return transporter data for a cached state of a transporter', async () => {
      userService.get.mockResolvedValue(mockTransporter);
      userService.getTransporter.mockResolvedValue(mockTransporter as any);

      const result = await service.getUserState(
        session({
          userId: 'user-456',
          userState: UserStatesEnum.PersonalInfoSubmitted,
        }),
      );

      expect(result).toMatchObject({
        userState: UserStatesEnum.PersonalInfoSubmitted,
        transporter: { id: 'user-456', role: RolesEnum.transporter },
      });
    });

    it('should return null for a cached non-authenticated state of a sender', async () => {
      userService.get.mockResolvedValue(mockSender);

      const result = await service.getUserState(
        session({ userState: UserStatesEnum.PersonalInfoSubmitted }),
      );

      expect(result).toBeNull();
    });

    it('should throw NotFound when the user is missing with no cached state', async () => {
      userService.get.mockResolvedValue(null);

      await expect(service.getUserState(session())).rejects.toThrow(
        NotFoundMessages.User,
      );
    });

    it('should compute and persist Authenticated for a sender with no cached state', async () => {
      userService.get.mockResolvedValue(mockSender);
      const ses = session();

      const result = await service.getUserState(ses);

      expect(result).toEqual({
        userState: UserStatesEnum.Authenticated,
        role: RolesEnum.sender,
      });
      expect(ses.userState).toBe(UserStatesEnum.Authenticated);
    });

    it('should compute a state for a transporter and persist it in the session', async () => {
      userService.get.mockResolvedValue(mockTransporter);
      userService.getTransporter.mockResolvedValue(mockTransporter as any);
      stateMachine.compute.mockReturnValue({
        userState: UserStatesEnum.PersonalInfoSubmitted,
        transporter: mockTransporter,
      });
      const ses = session({ userId: 'user-456' });

      const result = await service.getUserState(ses);

      expect(result).toMatchObject({
        userState: UserStatesEnum.PersonalInfoSubmitted,
        role: RolesEnum.transporter,
      });
      expect((result as any).transporter).toBeDefined();
      expect(ses.userState).toBe(UserStatesEnum.PersonalInfoSubmitted);
    });
  });
});
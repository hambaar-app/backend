import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { PrismaClient, RolesEnum, VerificationStatusEnum, GendersEnum, LicenseTypeEnum } from '../../../generated/prisma';
import * as utilities from '../../common/utilities';

jest.mock('../../common/utilities', () => ({
  formatPrismaError: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let s3Service: DeepMockProxy<S3Service>;

  const mockUser = {
    id: 'user-123',
    phoneNumber: '+989123456789',
    firstName: 'احمد',
    lastName: 'محمدی',
    gender: GendersEnum.male,
    role: RolesEnum.sender,
    phoneVerifiedAt: new Date(),
    email: null,
    emailVerifiedAt: null,
    birthDate: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockTransporter = {
    id: 'transporter-123',
    userId: 'user-123',
    nationalId: '1234567890',
    nationalIdStatusId: 'national-status-123',
    nationalIdDocumentKey: 'national-id-key',
    licenseNumber: '0987654321',
    licenseType: LicenseTypeEnum.grade_one,
    licenseStatusId: 'license-status-123',
    licenseDocumentKey: 'license-key',
    licenseExpiryDate: new Date('2025-12-31'),
    profilePictureKey: 'profile-pic-key',
    verificationStatusId: 'verification-status-123',
    registrationCardKey: null,
    insuranceDocumentKey: null,
    technicalInspectionKey: null,
    greenSheetKey: null,
    cardKey: null,
    vehiclePicsKey: null,
    rate: 4.5,
    rateCount: 10,
    bio: null,
    firstTripDate: null,
    lastTripDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    nationalIdStatus: {
      id: 'national-status-123',
      status: VerificationStatusEnum.pending,
      description: null,
    },
    licenseStatus: {
      id: 'license-status-123',
      status: VerificationStatusEnum.pending,
      description: null,
    },
    verificationStatus: {
      id: 'verification-status-123',
      status: VerificationStatusEnum.pending,
    },
    vehicles: [],
  };

  const mockProfile = {
    ...mockUser,
    transporter: mockTransporter,
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    prismaService = mockDeep<PrismaClient>();
    s3Service = mockDeep<S3Service>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaService },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('get', () => {
    it('should get user by where input successfully', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.get({ id: 'user-123' });

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should return null when user not found', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.get({ id: 'non-existent' });

      expect(result).toBeNull();
    });
  });

  describe('getByPhoneNumber', () => {
    it('should get user by phone number successfully', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.getByPhoneNumber('+989123456789');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { phoneNumber: '+989123456789' },
      });
    });

    it('should return null when user not found', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.getByPhoneNumber('+989999999999');

      expect(result).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('should get user profile with transporter data successfully', async () => {
      prismaService.user.findUniqueOrThrow.mockResolvedValue(mockProfile);
      s3Service.generateGetPresignedUrl.mockResolvedValue('https://presigned-url.com');

      const result = await service.getProfile('user-123');

      expect(result).toEqual({
        ...mockProfile,
        transporter: {
          ...mockTransporter,
          profilePictureUrl: 'https://presigned-url.com',
          licenseDocumentUrl: 'https://presigned-url.com',
          nationalIdDocumentUrl: 'https://presigned-url.com',
        },
      });
      expect(prismaService.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: {
          transporter: {
            include: {
              licenseStatus: true,
              nationalIdStatus: true,
              verificationStatus: true,
            },
          },
        },
      });
    });

    it('should handle user without transporter', async () => {
      const userWithoutTransporter = { ...mockUser, transporter: null };
      prismaService.user.findUniqueOrThrow.mockResolvedValue(userWithoutTransporter);
      s3Service.generateGetPresignedUrl.mockResolvedValue('https://presigned-url.com');

      const result = await service.getProfile('user-123');

      expect(result.transporter).toEqual({
        profilePictureUrl: 'https://presigned-url.com',
        licenseDocumentUrl: 'https://presigned-url.com',
        nationalIdDocumentUrl: 'https://presigned-url.com',
      });
    });

    it('should handle S3 URL generation errors gracefully', async () => {
      prismaService.user.findUniqueOrThrow.mockResolvedValue(mockProfile);
      s3Service.generateGetPresignedUrl.mockResolvedValue('https://presigned-url.com');

      const result = await service.getProfile('user-123');

      expect(result.transporter.profilePictureUrl).toBe('https://presigned-url.com');
      expect(result.transporter.licenseDocumentUrl).toBe('https://presigned-url.com');
      expect(result.transporter.nationalIdDocumentUrl).toBe('https://presigned-url.com');
    });

    it('should handle Prisma errors', async () => {
      const error = new Error('User not found');
      prismaService.user.findUniqueOrThrow.mockRejectedValue(error);
      ((utilities.formatPrismaError as unknown) as jest.Mock).mockImplementation(() => {
        throw new Error('Formatted error');
      });

      await expect(service.getProfile('user-123')).rejects.toThrow('Formatted error');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateDto = {
        firstName: 'علی',
        lastName: 'احمدی',
      };
      const updatedUser = { ...mockUser, ...updateDto };
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', updateDto);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateDto,
      });
    });

    it('should exclude phoneNumber from update data', async () => {
      const updateDto = {
        firstName: 'علی',
        lastName: 'احمدی',
        phoneNumber: '+989999999999', // This should be excluded
      };
      const updatedUser = { ...mockUser, firstName: 'علی', lastName: 'احمدی' };
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', updateDto);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          firstName: 'علی',
          lastName: 'احمدی',
        },
      });
    });

    it('should handle Prisma errors', async () => {
      const error = new Error('Update failed');
      prismaService.user.update.mockRejectedValue(error);
      ((utilities.formatPrismaError as unknown) as jest.Mock).mockImplementation(() => {
        throw new Error('Formatted error');
      });

      await expect(service.update('user-123', { firstName: 'علی' })).rejects.toThrow('Formatted error');
    });
  });

  describe('getTransporter', () => {
    it('should get transporter by where input successfully', async () => {
      prismaService.transporter.findFirstOrThrow.mockResolvedValue(mockTransporter);

      const result = await service.getTransporter({ userId: 'user-123' });

      expect(result).toEqual(mockTransporter);
      expect(prismaService.transporter.findFirstOrThrow).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          user: true,
          nationalIdStatus: true,
          licenseStatus: true,
          verificationStatus: true,
          vehicles: {
            include: {
              verificationStatus: true,
            },
          },
        },
      });
    });

    it('should handle Prisma errors', async () => {
      const error = new Error('Transporter not found');
      prismaService.transporter.findFirstOrThrow.mockRejectedValue(error);
      ((utilities.formatPrismaError as unknown) as jest.Mock).mockImplementation(() => {
        throw new Error('Formatted error');
      });

      await expect(service.getTransporter({ userId: 'user-123' })).rejects.toThrow('Formatted error');
    });
  });

  describe('updateTransporter', () => {
    it('should update transporter successfully without status creation', async () => {
      const updateDto = {
        profilePictureKey: 'new-profile-pic-key',
      };
      const updatedTransporter = { ...mockTransporter, ...updateDto };
      prismaService.transporter.update.mockResolvedValue(updatedTransporter);

      const result = await service.updateTransporter('user-123', updateDto);

      expect(result).toEqual(updatedTransporter);
      expect(prismaService.transporter.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: updateDto,
        include: {
          nationalIdStatus: true,
          licenseStatus: true,
        },
      });
    });

    it('should create nationalIdStatus when nationalId is provided', async () => {
      const updateDto = {
        nationalId: '9876543210',
      };
      const updatedTransporter = { ...mockTransporter, ...updateDto };
      prismaService.transporter.update.mockResolvedValue(updatedTransporter);

      const result = await service.updateTransporter('user-123', updateDto);

      expect(result).toEqual(updatedTransporter);
      expect(prismaService.transporter.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          ...updateDto,
          nationalIdStatus: {
            create: {
              status: 'pending',
              description: null,
            },
          },
        },
        include: {
          nationalIdStatus: true,
          licenseStatus: true,
        },
      });
    });

    it('should create licenseStatus when licenseNumber is provided', async () => {
      const updateDto = {
        licenseNumber: '1234567890',
      };
      const updatedTransporter = { ...mockTransporter, ...updateDto };
      prismaService.transporter.update.mockResolvedValue(updatedTransporter);

      const result = await service.updateTransporter('user-123', updateDto);

      expect(result).toEqual(updatedTransporter);
      expect(prismaService.transporter.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          ...updateDto,
          nationalIdStatus: {
            create: {
              status: 'pending',
              description: null,
            },
          },
        },
        include: {
          nationalIdStatus: true,
          licenseStatus: true,
        },
      });
    });

    it('should create both statuses when both nationalId and licenseNumber are provided', async () => {
      const updateDto = {
        nationalId: '9876543210',
        licenseNumber: '1234567890',
      };
      const updatedTransporter = { ...mockTransporter, ...updateDto };
      prismaService.transporter.update.mockResolvedValue(updatedTransporter);

      const result = await service.updateTransporter('user-123', updateDto);

      expect(result).toEqual(updatedTransporter);
      expect(prismaService.transporter.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          ...updateDto,
          nationalIdStatus: {
            create: {
              status: 'pending',
              description: null,
            },
          },
        },
        include: {
          nationalIdStatus: true,
          licenseStatus: true,
        },
      });
    });

    it('should handle Prisma errors', async () => {
      const error = new Error('Update failed');
      prismaService.transporter.update.mockRejectedValue(error);
      ((utilities.formatPrismaError as unknown) as jest.Mock).mockImplementation(() => {
        throw new Error('Formatted error');
      });

      await expect(service.updateTransporter('user-123', { profilePictureKey: 'new-key' })).rejects.toThrow('Formatted error');
    });
  });

  describe('Error scenarios', () => {
    it('should handle S3 service errors in getProfile', async () => {
      prismaService.user.findUniqueOrThrow.mockResolvedValue(mockProfile);
      s3Service.generateGetPresignedUrl.mockResolvedValue('');

      const result = await service.getProfile('user-123');
      expect(result).toBeDefined();
      expect(result.transporter.profilePictureUrl).toBe('');
    });
  });
});
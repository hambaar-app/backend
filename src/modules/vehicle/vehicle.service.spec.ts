import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { VehicleService } from './vehicle.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { S3Service } from '../s3/s3.service';
import { PrismaClient } from '../../../generated/prisma';
import { VehicleTypeEnum, VerificationStatusEnum } from '../../../generated/prisma';
import * as utilities from '../../common/utilities';

jest.mock('../../common/utilities', () => ({
  formatPrismaError: jest.fn(),
}));

describe('VehicleService', () => {
  let service: VehicleService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let userService: DeepMockProxy<UserService>;
  let s3Service: DeepMockProxy<S3Service>;

  const mockBrand = {
    id: 'brand-123',
    name: 'Toyota',
    englishName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockModel = {
    id: 'model-123',
    name: 'Camry',
    brandId: 'brand-123',
    englishName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    brand: mockBrand,
  };

  const mockTransporter = {
    id: 'transporter-123',
    userId: 'user-123',
  };

  const mockVehicle = {
    id: 'vehicle-123',
    vehicleType: VehicleTypeEnum.car,
    modelId: 'model-123',
    ownerId: 'transporter-123',
    vin: 'VIN123456789',
    licensePlate: 'ABC123',
    barcode: 'BARCODE123',
    greenSheetNumber: 'GS123',
    manufactureYear: 2020,
    color: 'White',
    technicalInspectionDate: new Date('2023-01-01'),
    technicalInspectionExpiryDate: new Date('2024-01-01'),
    insuranceNumber: 'INS123456',
    insuranceExpiryDate: new Date('2024-06-01'),
    registrationCardKey: 'reg-card-key',
    insuranceDocumentKey: 'insurance-key',
    maxWeightCapacity: 5000,
    isActive: true,
    verificationDocuments: {
      greenSheetKey: 'green-sheet-key',
      cardKey: 'card-key',
      vehiclePicsKey: ['pic1-key', 'pic2-key'],
    },
    verificationStatusId: 'status-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    model: mockModel,
    verificationStatus: {
      id: 'status-123',
      status: VerificationStatusEnum.pending,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      description: null,
    },
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();
    userService = mockDeep<UserService>();
    s3Service = mockDeep<S3Service>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: PrismaService, useValue: prismaService },
        { provide: UserService, useValue: userService },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  describe('createBrand', () => {
    it('should create a brand successfully', async () => {
      prismaService.vehicleBrand.create.mockResolvedValue(mockBrand);

      const result = await service.createBrand({ name: 'Toyota' });

      expect(result).toEqual(mockBrand);
      expect(prismaService.vehicleBrand.create).toHaveBeenCalledWith({
        data: { name: 'Toyota' },
      });
    });

    it('should handle Prisma errors', async () => {
      const error = new Error('Unique constraint failed');
      prismaService.vehicleBrand.create.mockRejectedValue(error);
      ((utilities.formatPrismaError as unknown) as jest.Mock).mockImplementation(() => {
        throw new Error('Formatted error');
      });

      await expect(service.createBrand({ name: 'Toyota' })).rejects.toThrow('Formatted error');
    });
  });

  describe('getAllBrands', () => {
    it('should return all brands without search', async () => {
      const brands = [mockBrand];
      prismaService.vehicleBrand.findMany.mockResolvedValue(brands);

      const result = await service.getAllBrands();

      expect(result).toEqual(brands);
      expect(prismaService.vehicleBrand.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: undefined,
            mode: 'insensitive',
          },
        },
      });
    });

    it('should return filtered brands with search', async () => {
      const brands = [mockBrand];
      prismaService.vehicleBrand.findMany.mockResolvedValue(brands);

      const result = await service.getAllBrands('toy');

      expect(result).toEqual(brands);
      expect(prismaService.vehicleBrand.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'toy',
            mode: 'insensitive',
          },
        },
      });
    });
  });

  describe('createModel', () => {
    it('should create a model successfully', async () => {
      const modelDto = {
        name: 'Camry',
        brandId: 'brand-123',
      };
      prismaService.vehicleModel.create.mockResolvedValue(mockModel);

      const result = await service.createModel(modelDto);

      expect(result).toEqual(mockModel);
      expect(prismaService.vehicleModel.create).toHaveBeenCalledWith({
        data: modelDto,
      });
    });
  });

  describe('getAllBrandModels', () => {
    it('should return all models for a brand without search', async () => {
      const models = [mockModel];
      prismaService.vehicleModel.findMany.mockResolvedValue(models);

      const result = await service.getAllBrandModels('brand-123');

      expect(result).toEqual(models);
      expect(prismaService.vehicleModel.findMany).toHaveBeenCalledWith({
        where: {
          brandId: 'brand-123',
          name: {
            contains: undefined,
            mode: 'insensitive',
          },
        },
      });
    });

    it('should return filtered models with search', async () => {
      const models = [mockModel];
      prismaService.vehicleModel.findMany.mockResolvedValue(models);

      const result = await service.getAllBrandModels('brand-123', 'cam');

      expect(result).toEqual(models);
      expect(prismaService.vehicleModel.findMany).toHaveBeenCalledWith({
        where: {
          brandId: 'brand-123',
          name: {
            contains: 'cam',
            mode: 'insensitive',
          },
        },
      });
    });
  });

  describe('create', () => {
    it('should create a vehicle successfully', async () => {
      const vehicleDto = {
        vehicleType: VehicleTypeEnum.truck,
        modelId: 'model-123',
        vin: 'VIN123456789',
        licensePlate: 'ABC123',
        barcode: 'BARCODE123',
        greenSheetNumber: 'GS123',
        manufactureYear: 2020,
        color: 'White',
        technicalInspectionDate: new Date('2023-01-01'),
        technicalInspectionExpiryDate: new Date('2024-01-01'),
        verificationDocuments: {
          greenSheetKey: 'green-sheet-key',
          cardKey: 'card-key',
          vehiclePicsKey: ['pic1-key', 'pic2-key'],
        },
      };

      userService.getTransporter.mockResolvedValue(mockTransporter as any);
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.verificationStatus.create.mockResolvedValue({
        id: 'status-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        status: VerificationStatusEnum.pending,
        description: null,
      });
      prismaService.vehicle.create.mockResolvedValue(mockVehicle);

      const result = await service.create('user-123', vehicleDto);

      expect(result).toEqual(mockVehicle);
      expect(userService.getTransporter).toHaveBeenCalledWith({ userId: 'user-123' }, prismaService);
      expect(prismaService.verificationStatus.create).toHaveBeenCalledWith({ data: {} });
      expect(prismaService.vehicle.create).toHaveBeenCalledWith({
        data: {
          vehicleType: VehicleTypeEnum.truck,
          modelId: 'model-123',
          vin: 'VIN123456789',
          licensePlate: 'ABC123',
          barcode: 'BARCODE123',
          greenSheetNumber: 'GS123',
          manufactureYear: 2020,
          color: 'White',
          technicalInspectionDate: new Date('2023-01-01'),
          technicalInspectionExpiryDate: new Date('2024-01-01'),
          ownerId: 'transporter-123',
          verificationDocuments: vehicleDto.verificationDocuments,
          verificationStatusId: 'status-123',
        },
      });
    });
  });

  describe('getById', () => {
    it('should get vehicle by id successfully', async () => {
      prismaService.vehicle.findUniqueOrThrow.mockResolvedValue(mockVehicle);
      s3Service.generateGetPresignedUrl.mockResolvedValue('https://presigned-url.com');

      const result = await service.getById('vehicle-123');

      expect(result.verificationDocuments).toEqual({
        greenSheetKey: 'green-sheet-key',
        cardKey: 'card-key',
        vehiclePicsKey: ['pic1-key', 'pic2-key'],
        presignedUrls: {
          greenSheet: 'https://presigned-url.com',
          card: 'https://presigned-url.com',
          vehiclePics: ['https://presigned-url.com', 'https://presigned-url.com'],
        },
      });
      expect(prismaService.vehicle.findUniqueOrThrow).toHaveBeenCalledWith({
        where: {
          id: 'vehicle-123',
          deletedAt: null,
        },
        include: {
          model: {
            include: {
              brand: true,
            },
          },
          verificationStatus: true,
        },
      });
    });

    it('should handle vehicle without verification documents', async () => {
      const vehicleWithoutDocs = { ...mockVehicle, verificationDocuments: null };
      prismaService.vehicle.findUniqueOrThrow.mockResolvedValue(vehicleWithoutDocs);

      const result = await service.getById('vehicle-123');

      expect(result).toEqual(vehicleWithoutDocs);
    });

    it('should handle S3 URL generation errors gracefully', async () => {
      prismaService.vehicle.findUniqueOrThrow.mockResolvedValue(mockVehicle);
      s3Service.generateGetPresignedUrl.mockResolvedValue('');

      const result = await service.getById('vehicle-123');

      expect(result.verificationDocuments).toBeDefined();
      expect(result.verificationDocuments).toEqual({
        greenSheetKey: 'green-sheet-key',
        cardKey: 'card-key',
        vehiclePicsKey: ['pic1-key', 'pic2-key'],
        presignedUrls: {
          greenSheet: '',
          card: '',
          vehiclePics: ['', ''],
        },
      });
    });
  });

  describe('getAllVehicles', () => {
    it('should get all vehicles for a user successfully', async () => {
      const vehicles = [mockVehicle];
      prismaService.vehicle.findMany.mockResolvedValue(vehicles);
      s3Service.generateGetPresignedUrl.mockResolvedValue('https://presigned-url.com');

      const result = await service.getAllVehicles('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].verificationDocuments).toBeDefined();
      expect(prismaService.vehicle.findMany).toHaveBeenCalledWith({
        where: {
          owner: {
            userId: 'user-123',
          },
        },
        select: {
          id: true,
          vehicleType: true,
          model: {
            include: {
              brand: true,
            },
          },
          manufactureYear: true,
          color: true,
          verificationDocuments: true,
        },
      });
    });

    it('should handle vehicles without verification documents', async () => {
      const vehiclesWithoutDocs = [{ ...mockVehicle, verificationDocuments: null }];
      prismaService.vehicle.findMany.mockResolvedValue(vehiclesWithoutDocs);

      const result = await service.getAllVehicles('user-123');

      expect(result).toEqual(vehiclesWithoutDocs);
    });
  });

  describe('update', () => {
    it('should update vehicle successfully', async () => {
      const updateDto = {
        color: 'Red',
        verificationDocuments: {
          greenSheetKey: 'new-green-sheet-key',
          cardKey: 'card-key',
          vehiclePicsKey: ['pic1-key', 'pic2-key'],
        },
      };

      prismaService.vehicle.findUniqueOrThrow.mockResolvedValue(mockVehicle);
      prismaService.vehicle.update.mockResolvedValue({ ...mockVehicle, ...updateDto });

      const result = await service.update('vehicle-123', updateDto);

      expect(result).toEqual({ ...mockVehicle, ...updateDto });
      expect(prismaService.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-123' },
        data: {
          verificationDocuments: {
            ...mockVehicle.verificationDocuments,
            greenSheetKey: 'new-green-sheet-key',
          },
          color: 'Red',
        },
      });
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { CityRepository } from './city.repository';
import { PrismaService } from '../prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../../generated/prisma';

describe('CityRepository', () => {
  let repository: CityRepository;
  let prisma: DeepMockProxy<PrismaClient>;

  const mockCity = { id: 'city-123', name: 'Tehran' } as any;
  const mockCityWithProvince = {
    ...mockCity,
    province: { id: 'province-123', name: 'Tehran' },
  };

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CityRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repository = module.get<CityRepository>(CityRepository);
  });

  describe('findCityOrThrow', () => {
    it('should find a city by id', async () => {
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);

      const result = await repository.findCityOrThrow('city-123');

      expect(result).toEqual(mockCity);
      expect(prisma.city.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'city-123' },
      });
    });

    it('should read through the given transaction when provided', async () => {
      const tx = mockDeep<PrismaClient>();
      tx.city.findUniqueOrThrow.mockResolvedValue(mockCity);

      const result = await repository.findCityOrThrow('city-123', tx);

      expect(result).toEqual(mockCity);
      expect(tx.city.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'city-123' },
      });
      expect(prisma.city.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('findCityWithProvince', () => {
    it('should find a city with its province', async () => {
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCityWithProvince);

      const result = await repository.findCityWithProvince('city-123');

      expect(result).toEqual(mockCityWithProvince);
      expect(prisma.city.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'city-123' },
        include: { province: true },
      });
    });

    it('should read through the given transaction when provided', async () => {
      const tx = mockDeep<PrismaClient>();
      tx.city.findUniqueOrThrow.mockResolvedValue(mockCityWithProvince);

      const result = await repository.findCityWithProvince('city-123', tx);

      expect(result).toEqual(mockCityWithProvince);
      expect(tx.city.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'city-123' },
        include: { province: true },
      });
    });
  });
});

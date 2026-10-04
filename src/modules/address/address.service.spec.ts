import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionRunner } from '../prisma/transaction-runner';
import { CityRepository } from '../prisma/repositories/city.repository';

describe('AddressService', () => {
  let service: AddressService;
  let prisma: DeepMockProxy<PrismaClient>;
  let runner: DeepMockProxy<TransactionRunner>;
  let cities: DeepMockProxy<CityRepository>;

  const mockCity = {
    id: 'city-123',
    name: 'تهران',
    province: { id: 'province-123', name: 'تهران' },
  } as any;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();
    runner = mockDeep<TransactionRunner>();
    cities = mockDeep<CityRepository>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: PrismaService, useValue: prisma },
        { provide: TransactionRunner, useValue: runner },
        { provide: CityRepository, useValue: cities },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
  });

  describe('getAllProvinces', () => {
    it('should list provinces', async () => {
      prisma.province.findMany.mockResolvedValue([{ id: 'p-1' }] as any);

      const result = await service.getAllProvinces();

      expect(result).toEqual([{ id: 'p-1' }]);
      expect(prisma.province.findMany).toHaveBeenCalledWith();
    });
  });

  describe('getAllProvinceCities', () => {
    it('should list cities of a province', async () => {
      prisma.city.findMany.mockResolvedValue([{ id: 'c-1' }] as any);

      const result = await service.getAllProvinceCities('p-1');

      expect(result).toEqual([{ id: 'c-1' }]);
      expect(prisma.city.findMany).toHaveBeenCalledWith({
        where: { provinceId: 'p-1' },
      });
    });
  });

  describe('searchCitiesByName', () => {
    it('should search by name or english name', async () => {
      prisma.city.findMany.mockResolvedValue([{ id: 'c-1' }] as any);

      const result = await service.searchCitiesByName('تهران');

      expect(result).toEqual([{ id: 'c-1' }]);
      expect(prisma.city.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'تهران', mode: 'insensitive' } },
            { englishName: { contains: 'تهران', mode: 'insensitive' } },
          ],
        },
      });
    });
  });

  describe('create', () => {
    it('should create an address with denormalized city and province', async () => {
      cities.findCityWithProvince.mockResolvedValue(mockCity);
      prisma.address.create.mockResolvedValue({ id: 'a-1' } as any);

      const result = await service.create('user-123', {
        cityId: 'city-123',
        title: 'خانه',
      } as any);

      expect(result).toEqual({ id: 'a-1' });
      expect(runner.run).toHaveBeenCalledTimes(1);
      expect(cities.findCityWithProvince).toHaveBeenCalledWith(
        'city-123',
        prisma,
      );
      expect(prisma.address.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          title: 'خانه',
          province: 'تهران',
          city: 'تهران',
        },
      });
    });
  });

  describe('getAll', () => {
    it('should list highlighted addresses with search defaults', async () => {
      prisma.address.findMany.mockResolvedValue([{ id: 'a-1' }] as any);

      const result = await service.getAll('user-123');

      expect(result).toEqual([{ id: 'a-1' }]);
      expect(prisma.address.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isHighlighted: true,
          title: { contains: undefined, mode: 'insensitive' },
        },
      });
    });

    it('should search non-highlighted addresses', async () => {
      prisma.address.findMany.mockResolvedValue([] as any);

      await service.getAll('user-123', 'خانه', false);

      expect(prisma.address.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isHighlighted: false,
          title: { contains: 'خانه', mode: 'insensitive' },
        },
      });
    });
  });

  describe('update', () => {
    it('should update an address', async () => {
      prisma.address.update.mockResolvedValue({ id: 'a-1' } as any);

      const result = await service.update('a-1', { title: 'new' } as any);

      expect(result).toEqual({ id: 'a-1' });
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'a-1' },
        data: { title: 'new' },
      });
    });
  });
});

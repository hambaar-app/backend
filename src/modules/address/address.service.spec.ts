import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

describe('AddressService', () => {
  let service: AddressService;
  let prismaService: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: PrismaService, useValue: prismaService }
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

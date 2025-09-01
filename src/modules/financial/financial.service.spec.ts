import { Test, TestingModule } from '@nestjs/testing';
import { FinancialService } from './financial.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

describe('FinancialService', () => {
  let service: FinancialService;
  let prismaService: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<FinancialService>(FinancialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

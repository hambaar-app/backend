import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UserService } from '../user/user.service';
import { PrismaClient } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

describe('SupportService', () => {
  let service: SupportService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let userService: DeepMockProxy<UserService>;

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();
    userService = mockDeep<UserService>();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prismaService },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

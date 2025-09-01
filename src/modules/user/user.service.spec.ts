import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../generated/prisma';
import { S3Service } from '../s3/s3.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let s3Service: DeepMockProxy<S3Service>;

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();
    s3Service = mockDeep<S3Service>();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaService },
        { provide: S3Service, useValue: s3Service }
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

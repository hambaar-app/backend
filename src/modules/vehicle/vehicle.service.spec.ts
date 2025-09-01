import { Test, TestingModule } from '@nestjs/testing';
import { VehicleService } from './vehicle.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../generated/prisma';
import { UserService } from '../user/user.service';
import { S3Service } from '../s3/s3.service';
import { PrismaService } from '../prisma/prisma.service';

describe('VehicleService', () => {
  let service: VehicleService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let userService: DeepMockProxy<UserService>;
  let s3Service: DeepMockProxy<S3Service>;

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();
    userService = mockDeep<UserService>();
    s3Service = mockDeep<S3Service>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: PrismaService, useValue: prismaService },
        { provide: UserService, useValue: userService },
        { provide: S3Service, useValue: s3Service }
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

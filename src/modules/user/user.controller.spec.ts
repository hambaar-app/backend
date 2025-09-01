import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AccessTokenGuard } from '../auth/guard/token.guard';

describe('UserController', () => {
  let controller: UserController;
  let service: DeepMockProxy<UserService>;

  beforeEach(async () => {
    service = mockDeep<UserService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: service }
      ]
    })
    .overrideGuard(AccessTokenGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

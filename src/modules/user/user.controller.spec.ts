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
      providers: [{ provide: UserService, useValue: service }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate profile routes to UserService', async () => {
    await controller.getUserProfile('user-123');
    expect(service.getProfile).toHaveBeenCalledWith('user-123');

    await controller.updateUser({ firstName: 'A' } as any, 'user-123');
    expect(service.update).toHaveBeenCalledWith('user-123', {
      firstName: 'A',
    });

    await controller.updateTransporter({ bio: 'b' } as any, 'user-123');
    expect(service.updateTransporter).toHaveBeenCalledWith('user-123', {
      bio: 'b',
    });
  });
});

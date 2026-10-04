import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { NotificationService } from './notification.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: DeepMockProxy<NotificationService>;

  beforeEach(async () => {
    service = mockDeep<NotificationService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: service }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate notification routes to NotificationService', async () => {
    await controller.getAllNotifications(2, 5, 'user-123');
    expect(service.getAll).toHaveBeenCalledWith('user-123', 2, 5);

    await controller.getUnreadCount('user-123');
    expect(service.unreadCount).toHaveBeenCalledWith('user-123');
  });
});

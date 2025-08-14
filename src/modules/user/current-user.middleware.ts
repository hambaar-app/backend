import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from 'src/modules/user/user.service';
import { AuthMessages } from '../../common/enums/messages.enum';

export const CurrentUser = createParamDecorator(
  (key: string, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest() as Request;    
    return key ? request.user?.[key] : request.user;
  },
);

@Injectable()
export class CurrentUserMiddleware implements NestMiddleware {
  constructor(private userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.session;
    const phoneNumber = req.user?.phoneNumber;

    if (userId && !phoneNumber) {            
      const user = await this.userService.get({ id: userId });      
      if (!user) throw new ForbiddenException(AuthMessages.AccessDenied);
      req.user = user;
    }

    next();
  }
}

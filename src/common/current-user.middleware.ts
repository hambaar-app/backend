import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from "src/modules/user/user.service";
import { AuthMessages } from './enums/messages.enum';

@Injectable()
export class CurrentUserMiddleware implements NestMiddleware {
  constructor(private userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const id = req.user?.id;
    
    if (id) {
      const user = await this.userService.get({ id });
      if (!user) throw new ForbiddenException(AuthMessages.AccessDenied);
      req.user = user;
    }

    next();
  }
}
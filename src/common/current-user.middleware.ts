import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from "src/modules/user/user.service";


@Injectable()
export class CurrentUserMiddleware implements NestMiddleware {
  constructor(private userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.session;

    if (userId) {
      const user = await this.userService.get({ id: userId });
      req.user = user ?? undefined;
    }

    next();
  }
}
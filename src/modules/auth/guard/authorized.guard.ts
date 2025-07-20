import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { CookieNames } from 'src/common/enums/cookies.enum';
import { AuthMessages } from 'src/common/enums/messages.enum';

@Injectable()
export class AlreadyAuthorizedGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = request.cookies?.[CookieNames.AccessToken]

    if (accessToken) {
      throw new BadRequestException(AuthMessages.AlreadyAuthorized);
    }

    return true;
  }
}
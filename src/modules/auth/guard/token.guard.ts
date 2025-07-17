import { CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthTokens } from 'src/common/enums/auth.enum';
import { CookieNames } from 'src/common/enums/cookies.enum';
import { AuthMessages } from 'src/common/enums/messages.enum';
import { TokenService } from 'src/modules/token/token.service';

export class TemporaryGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tempToken = request.cookies?.[CookieNames.TemporaryToken];

    if (!tempToken) {
      throw new UnauthorizedException(AuthMessages);
    }

    const payload = this.tokenService.verifyToken(tempToken, AuthTokens.Temporary);
    if (!payload?.phoneNumber) {
      throw new UnauthorizedException(AuthMessages.InvalidAccessToken);
    }

    return true;
  }
}
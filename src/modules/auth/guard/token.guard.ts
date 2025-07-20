import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthTokens } from 'src/common/enums/auth.enum';
import { CookieNames } from 'src/common/enums/cookies.enum';
import { AuthMessages } from 'src/common/enums/messages.enum';
import { TokenService } from 'src/modules/token/token.service';

@Injectable()
export class TemporaryTokenGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tempToken = request.cookies?.[CookieNames.TemporaryToken];

    if (!tempToken) {
      throw new UnauthorizedException(AuthMessages.MissingTempToken);
    }

    const payload = this.tokenService.verifyToken(tempToken, AuthTokens.Temporary);
    if (!payload?.phoneNumber) {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }

    return true;
  }
}
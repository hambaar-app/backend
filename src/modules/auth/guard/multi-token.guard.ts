import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthTokens } from 'src/common/enums/auth.enum';
import { CookieNames } from 'src/common/enums/cookies.enum';
import { AuthMessages } from 'src/common/enums/messages.enum';
import { TokenService } from 'src/modules/token/token.service';

@Injectable()
export class MultiTokenGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const progressToken = request.cookies?.[CookieNames.ProgressToken] as string;
    const accessToken = request.cookies?.[CookieNames.AccessToken] as string;

    // Check ProgressToken
    if (progressToken) {
      try {
        const payload = this.tokenService.verifyToken(progressToken, AuthTokens.Progress);
        const isOkToken = payload.sub && payload.phoneNumber;
        
        if (isOkToken) {
          request.user = { id: payload.sub };
          return true;
        }
      } catch (error) {}
    }

    // Check AccessToken
    if (accessToken) {
      try {
        const payload = this.tokenService.verifyToken(accessToken, AuthTokens.Access);
        const isOkToken = payload.sub && payload.phoneNumber;
        
        if (isOkToken) {
          request.user = { id: payload.sub };
          return true;
        }
      } catch (error) {}
    }

    throw new UnauthorizedException(AuthMessages.MissingOrInvalidToken);
  }
}
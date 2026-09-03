import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { CookieNames } from '../enums/cookies.enum';
import { AuthTokens } from '../enums/auth.enum';
import { AuthMessages } from '../enums/messages.enum';
import { TokenService } from '../../modules/token/token.service';

/**
 * Tries ProgressToken then AccessToken. Sets request.user = { id } from the
 * first valid token. No session comparison. Fixes B-2: spread preserves prior
 * user fields, id always wins.
 */
@Injectable()
export class MultiTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check ProgressToken
    const progressToken = request.cookies?.[CookieNames.ProgressToken] as
      | string
      | undefined;
    if (progressToken) {
      try {
        const payload = this.tokenService.verifyToken(
          progressToken,
          AuthTokens.Progress,
        );
        if (payload.sub && payload.phoneNumber) {
          request.user = { ...request.user, id: payload.sub };
          return true;
        }
      } catch {
        /* token invalid — fall through to the next token type */
      }
    }

    // Check AccessToken
    const accessToken = request.cookies?.[CookieNames.AccessToken] as
      | string
      | undefined;
    if (accessToken) {
      try {
        const payload = this.tokenService.verifyToken(
          accessToken,
          AuthTokens.Access,
        );
        if (payload.sub && payload.phoneNumber) {
          request.user = { ...request.user, id: payload.sub };
          return true;
        }
      } catch {
        /* token invalid — fall through to unauthorized response */
      }
    }

    throw new UnauthorizedException(AuthMessages.MissingOrInvalidToken);
  }
}

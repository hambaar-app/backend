import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { CookieNames } from '../enums/cookies.enum';
import { AuthTokens } from '../enums/auth.enum';
import { TokenService } from '../../modules/token/token.service';
import { AuthMessages } from '../enums/messages.enum';

export interface TokenGuardOptions {
  cookieName: CookieNames;
  tokenType: AuthTokens;
  /** How the token payload is validated against the session. */
  matchPolicy: 'phone' | 'phone-or-sub' | 'multi';
  missingMessage: AuthMessages;
}

/**
 * Base class for all token-based guards. Fixes B-2: the verified `id` from the
 * token payload always wins over any prior value on request.user.
 */
@Injectable()
export abstract class BaseTokenGuard implements CanActivate {
  private readonly options: TokenGuardOptions;

  constructor(
    protected readonly tokenService: TokenService,
    options: TokenGuardOptions,
  ) {
    this.options = options;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.[this.options.cookieName] as string | undefined;

    if (!token) {
      throw new UnauthorizedException(this.options.missingMessage);
    }

    const payload = this.tokenService.verifyToken(token, this.options.tokenType);

    if (!this.matchesSession(request, payload)) {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }

    // B-2 fix: verified id from token always wins
    request.user = {
      ...request.user,
      id: payload.sub,
    };

    return true;
  }

  protected matchesSession(
    request: Request,
    payload: { sub?: string; phoneNumber?: string },
  ): boolean {
    const session = request.session;

    switch (this.options.matchPolicy) {
      case 'phone':
        return (
          !!payload.phoneNumber &&
          payload.phoneNumber === session.phoneNumber
        );
      case 'phone-or-sub':
        return (
          !!payload.sub &&
          !!payload.phoneNumber &&
          session.phoneNumber === payload.phoneNumber
        );
      default:
        return !!payload.sub && !!payload.phoneNumber;
    }
  }
}

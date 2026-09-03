import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { CookieNames } from '../enums/cookies.enum';
import { AuthTokens } from '../enums/auth.enum';
import { AuthMessages } from '../enums/messages.enum';
import { TokenService } from '../../modules/token/token.service';

/**
 * Inverse guard: if the user is already authorized (valid access token whose
 * phone/sub matches the session), reject with 400 AlreadyAuthorized.
 * Otherwise pass through.
 */
@Injectable()
export class DenyAuthorizedGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session;
    const accessToken = request.cookies?.[CookieNames.AccessToken] as
      | string
      | undefined;

    let payload: JwtPayload | undefined;
    try {
      payload = this.tokenService.verifyToken(accessToken as string, AuthTokens.Access);
    } catch {
      return true;
    }

    if (!payload) {
      return true;
    }

    const isOkToken =
      session.phoneNumber === payload.phoneNumber ||
      session.userId === payload.sub;
    if (isOkToken) {
      throw new BadRequestException(AuthMessages.AlreadyAuthorized);
    }

    return true;
  }
}

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
    const session = request.session;
    const tempToken = request.cookies?.[CookieNames.TemporaryToken] as string;

    if (!tempToken) {
      throw new UnauthorizedException(AuthMessages.MissingTempToken);
    }

    const payload = this.tokenService.verifyToken(tempToken, AuthTokens.Temporary);
    if (!payload.phoneNumber || payload.phoneNumber !== session.phoneNumber) {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    } 

    return true;
  }
}

@Injectable()
export class ProgressTokenGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session;
    const progressToken = request.cookies?.[CookieNames.ProgressToken] as string;

    if (!progressToken) {
      throw new UnauthorizedException(AuthMessages.MissingProgressToken);
    }

    const payload = this.tokenService.verifyToken(progressToken, AuthTokens.Progress);
    const isOkToken = payload.sub && payload.phoneNumber && (session.phoneNumber === payload.phoneNumber);
  
    if (!isOkToken) {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }

    return true;
  }
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session;
    const accessToken = request.cookies?.[CookieNames.AccessToken] as string;

    if (!accessToken) {
      throw new UnauthorizedException(AuthMessages.MissingAccessToken);
    }

    const payload = this.tokenService.verifyToken(accessToken, AuthTokens.Access);
    const isOkToken = payload.sub && payload.phoneNumber && (session.phoneNumber === payload.phoneNumber);
  
    if (!isOkToken) {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }

    return true;
  }
}
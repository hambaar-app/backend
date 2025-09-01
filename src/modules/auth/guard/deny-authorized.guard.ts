import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { AuthTokens } from '../../../common/enums/auth.enum';
import { CookieNames } from '../../../common/enums/cookies.enum';
import { AuthMessages } from '../../../common/enums/messages.enum';
import { TokenService } from '../../../modules/token/token.service';

@Injectable()
export class DenyAuthorizedGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session;
    const accessToken = request.cookies?.[CookieNames.AccessToken] as string;
  
    let payload: JwtPayload | undefined;
    try {
      payload = this.tokenService.verifyToken(accessToken, AuthTokens.Access);
    } catch (error) {
      return true;
    }

    const isOkToken = (session.phoneNumber === payload.phoneNumber) 
        || (session.userId === payload.sub);
    if (isOkToken) {
      throw new BadRequestException(AuthMessages.AlreadyAuthorized);
    }

    return true;
  }
}
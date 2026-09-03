import { Injectable } from '@nestjs/common';
import { CookieNames } from '../enums/cookies.enum';
import { AuthTokens } from '../enums/auth.enum';
import { AuthMessages } from '../enums/messages.enum';
import { TokenService } from '../../modules/token/token.service';
import { BaseTokenGuard } from './token.guard.base';

@Injectable()
export class TemporaryTokenGuard extends BaseTokenGuard {
  constructor(tokenService: TokenService) {
    super(tokenService, {
      cookieName: CookieNames.TemporaryToken,
      tokenType: AuthTokens.Temporary,
      matchPolicy: 'phone',
      missingMessage: AuthMessages.MissingTempToken,
    });
  }
}

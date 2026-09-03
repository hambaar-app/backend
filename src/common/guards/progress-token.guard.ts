import { Injectable } from '@nestjs/common';
import { CookieNames } from '../enums/cookies.enum';
import { AuthTokens } from '../enums/auth.enum';
import { AuthMessages } from '../enums/messages.enum';
import { TokenService } from '../../modules/token/token.service';
import { BaseTokenGuard } from './token.guard.base';

@Injectable()
export class ProgressTokenGuard extends BaseTokenGuard {
  constructor(tokenService: TokenService) {
    super(tokenService, {
      cookieName: CookieNames.ProgressToken,
      tokenType: AuthTokens.Progress,
      matchPolicy: 'phone-or-sub',
      missingMessage: AuthMessages.MissingProgressToken,
    });
  }
}

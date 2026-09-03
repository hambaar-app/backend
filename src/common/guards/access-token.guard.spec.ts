import { UnauthorizedException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AccessTokenGuard } from './access-token.guard';
import { TokenService } from '../../modules/token/token.service';
import { CookieNames } from '../enums/cookies.enum';
import { AuthTokens } from '../enums/auth.enum';
import { AuthMessages } from '../enums/messages.enum';

const buildContext = (cookies: any = {}, session: any = {}) => {
  const request = { cookies, session };
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
};

describe('AccessTokenGuard', () => {
  let guard: AccessTokenGuard;
  let tokenService: DeepMockProxy<TokenService>;

  beforeEach(() => {
    tokenService = mockDeep<TokenService>();
    guard = new AccessTokenGuard(tokenService);
  });

  it('throws MissingAccessToken when cookie is absent', async () => {
    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      AuthMessages.MissingAccessToken,
    );
  });

  it('throws InvalidToken when phone does not match session', async () => {
    tokenService.verifyToken.mockReturnValue({ sub: 'u1', phoneNumber: '0912' });
    await expect(
      guard.canActivate(
        buildContext(
          { [CookieNames.AccessToken]: 'a' },
          { phoneNumber: '0999' },
        ),
      ),
    ).rejects.toThrow(AuthMessages.InvalidToken);
  });

  it('passes and sets user id when phone matches session', async () => {
    tokenService.verifyToken.mockReturnValue({ sub: 'u1', phoneNumber: '0912' });
    const ctx = buildContext(
      { [CookieNames.AccessToken]: 'a' },
      { phoneNumber: '0912' },
    );
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(tokenService.verifyToken).toHaveBeenCalledWith('a', AuthTokens.Access);
    expect(ctx.switchToHttp().getRequest().user).toEqual({ id: 'u1' });
  });
});

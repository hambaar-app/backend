import { BadRequestException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { DenyAuthorizedGuard } from './deny-authorized.guard';
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

describe('DenyAuthorizedGuard', () => {
  let guard: DenyAuthorizedGuard;
  let tokenService: DeepMockProxy<TokenService>;

  beforeEach(() => {
    tokenService = mockDeep<TokenService>();
    guard = new DenyAuthorizedGuard(tokenService);
  });

  it('passes through when no access token is present', async () => {
    const result = await guard.canActivate(buildContext());
    expect(result).toBe(true);
  });

  it('passes through when token verification fails', async () => {
    tokenService.verifyToken.mockImplementation(() => {
      throw new Error('bad');
    });
    const result = await guard.canActivate(
      buildContext({ [CookieNames.AccessToken]: 'a' }, {}),
    );
    expect(result).toBe(true);
  });

  it('throws AlreadyAuthorized (400) when phone matches session', async () => {
    tokenService.verifyToken.mockReturnValue({ sub: 'u1', phoneNumber: '0912' });
    await expect(
      guard.canActivate(
        buildContext(
          { [CookieNames.AccessToken]: 'a' },
          { phoneNumber: '0912', userId: 'other' },
        ),
      ),
    ).rejects.toThrow(AuthMessages.AlreadyAuthorized);
  });

  it('throws AlreadyAuthorized when session.userId matches sub', async () => {
    tokenService.verifyToken.mockReturnValue({ sub: 'u1', phoneNumber: '0912' });
    await expect(
      guard.canActivate(
        buildContext(
          { [CookieNames.AccessToken]: 'a' },
          { phoneNumber: '0999', userId: 'u1' },
        ),
      ),
    ).rejects.toThrow(AuthMessages.AlreadyAuthorized);
  });

  it('passes through when neither phone nor sub match', async () => {
    tokenService.verifyToken.mockReturnValue({ sub: 'u1', phoneNumber: '0912' });
    const result = await guard.canActivate(
      buildContext(
        { [CookieNames.AccessToken]: 'a' },
        { phoneNumber: '0999', userId: 'other' },
      ),
    );
    expect(result).toBe(true);
  });
});

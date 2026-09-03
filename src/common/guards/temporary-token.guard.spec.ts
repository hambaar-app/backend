import { UnauthorizedException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { TemporaryTokenGuard } from './temporary-token.guard';
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

describe('TemporaryTokenGuard', () => {
  let guard: TemporaryTokenGuard;
  let tokenService: DeepMockProxy<TokenService>;

  beforeEach(() => {
    tokenService = mockDeep<TokenService>();
    guard = new TemporaryTokenGuard(tokenService);
  });

  it('throws MissingTempToken when cookie is absent', async () => {
    tokenService.verifyToken.mockReturnValue({ phoneNumber: '0912' });
    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      AuthMessages.MissingTempToken,
    );
  });

  it('throws InvalidToken when phone does not match session', async () => {
    tokenService.verifyToken.mockReturnValue({ phoneNumber: '0912' });
    await expect(
      guard.canActivate(buildContext(
        { [CookieNames.TemporaryToken]: 't' },
        { phoneNumber: '0999' },
      )),
    ).rejects.toThrow(AuthMessages.InvalidToken);
  });

  it('passes and sets user id when phone matches session', async () => {
    tokenService.verifyToken.mockReturnValue({ sub: 'u1', phoneNumber: '0912' });
    const ctx = buildContext(
      { [CookieNames.TemporaryToken]: 't' },
      { phoneNumber: '0912' },
    );
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(tokenService.verifyToken).toHaveBeenCalledWith('t', AuthTokens.Temporary);
    expect(ctx.switchToHttp().getRequest().user).toEqual({ id: 'u1' });
  });

  it('overrides prior user.id with the verified id (B-2)', async () => {
    tokenService.verifyToken.mockReturnValue({ sub: 'verified-id', phoneNumber: '0912' });
    const ctx = buildContext(
      { [CookieNames.TemporaryToken]: 't' },
      { phoneNumber: '0912' },
    );
    ctx.switchToHttp().getRequest().user = { id: 'stale', role: 'sender' };
    await guard.canActivate(ctx);
    expect(ctx.switchToHttp().getRequest().user).toEqual({
      id: 'verified-id',
      role: 'sender',
    });
  });

  it('throws InvalidToken when verifyToken throws (expired/invalid)', async () => {
    tokenService.verifyToken.mockImplementation(() => {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    });
    await expect(
      guard.canActivate(buildContext({ [CookieNames.TemporaryToken]: 't' }, {})),
    ).rejects.toThrow(AuthMessages.InvalidToken);
  });
});

import { SessionData } from 'express-session';
import { clearAuthData, setSessionAuth, setUserState } from './session-utils';
import { UserStatesEnum } from '../types/auth.enums';

describe('session-utils', () => {
  const createSession = () =>
    ({
      userId: undefined,
      phoneNumber: undefined,
      userState: undefined,
      accessToken: '',
      lastAccessed: new Date(),
      packages: [],
    }) as unknown as SessionData;

  describe('setUserState', () => {
    it('should set the userState on the session', () => {
      const session = createSession();
      setUserState(session, UserStatesEnum.VehicleInfoSubmitted);
      expect(session.userState).toBe(UserStatesEnum.VehicleInfoSubmitted);
    });
  });

  describe('setSessionAuth', () => {
    it('should set userId and phoneNumber on the session', () => {
      const session = createSession();
      setSessionAuth(session, 'user-1', '+989123456789');
      expect(session.userId).toBe('user-1');
      expect(session.phoneNumber).toBe('+989123456789');
    });
  });

  describe('clearAuthData', () => {
    it('should clear userId, phoneNumber and userState', () => {
      const session = createSession();
      setSessionAuth(session, 'user-1', '+989123456789');
      setUserState(session, UserStatesEnum.Authenticated);

      clearAuthData(session);

      expect(session.userId).toBeUndefined();
      expect(session.phoneNumber).toBeUndefined();
      expect(session.userState).toBeUndefined();
    });
  });
});
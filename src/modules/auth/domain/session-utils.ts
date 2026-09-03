import { SessionData } from 'express-session';
import { UserStatesEnum } from '../types/auth.enums';

/**
 * Pure session mutation helpers. Centralizes session writes so that
 * controllers never mutate session state directly (A-4 mitigation).
 */

export function setUserState(
  session: SessionData,
  state: UserStatesEnum,
): void {
  session.userState = state;
}

export function setSessionAuth(
  session: SessionData,
  userId: string,
  phoneNumber: string,
): void {
  session.userId = userId;
  session.phoneNumber = phoneNumber;
}

export function clearAuthData(session: SessionData): void {
  session.userId = undefined;
  session.phoneNumber = undefined;
  session.userState = undefined;
}

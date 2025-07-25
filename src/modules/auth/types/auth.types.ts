import { AuthTokens } from 'src/common/enums/auth.enum';
import { UserStatesEnum } from './auth.enums';
import { Transporter } from 'generated/prisma';

export interface OtpData {
  code: number;
  expiresIn: number;
  createdAt: number;
}

export interface UserAttempts {
  sendAttempts: number;
  lastSendAttempt: number;
  checkAttempts: number;
  blockedUntil?: number;
}

export interface CachedUserData {
  otp?: OtpData;
  attempts: UserAttempts;
}

export interface CheckOtpResult {
  isNewUser: boolean;
  userId?: string;
  token: string;
  type: AuthTokens;
  userState?: UserStatesEnum;
  transporter?: Transporter;
}
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
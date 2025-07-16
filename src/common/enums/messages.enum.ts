export enum AuthMessages {
  OtpExpired = 'OTP not found or has expired. Please request a new one.',
  OtpInvalid = 'Invalid OTP code. Please check and try again.',
  InvalidToken = `Invalid access token format.`,
  TokenExpired = `Access token has expired`,
  TokenVerificationFailed = `Access token verification failed.`
}
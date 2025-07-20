export enum AuthMessages {
  OtpNotExpired = 'The last OTP has not expired yet. Please try again later.',
  OtpExpired = 'OTP not found or has expired. Please request a new one.',
  OtpInvalid = 'Invalid OTP code. Please check and try again.',
  MaxAttempts = 'Maximum send attempts exceeded. Please try again later.',
  InvalidToken = `Invalid token format.`,
  MissingTempToken = 'Temporary token is required but was not provided. Please auth with otp first.',
  SendOtpFailed = 'Failed to send OTP.',
  TooManyAttempts = 'Too many failed attempts. Please try again later.'
}
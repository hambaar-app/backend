export enum AuthMessages {
  OtpExpired = 'OTP not found or has expired. Please request a new one.',
  OtpInvalid = 'Invalid OTP code. Please check and try again.',
  InvalidToken = `Invalid token format.`,
  MissingTempToken = 'Temporary token is required but was not provided. Please auth with otp first.',
}
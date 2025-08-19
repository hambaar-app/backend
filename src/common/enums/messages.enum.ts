export enum AuthMessages {
  OtpNotExpired = 'The last OTP has not expired yet. Please try again later.',
  OtpExpired = 'OTP not found or has expired. Please request a new one.',
  OtpInvalid = 'Invalid OTP code. Please check and try again.',
  MaxAttempts = 'Maximum send attempts exceeded. Please try again later.',
  InvalidToken = `Invalid token. Please authorize first.`,
  MissingTempToken = 'Temporary token is required but was not provided. Please auth with otp first.',
  MissingProgressToken = 'Progress token is required but was not provided.',
  MissingAccessToken = 'Access token is required but was not provided.',
  SendOtpFailed = 'Failed to send OTP.',
  TooManyAttempts = 'Too many failed attempts. Please try again later.',
  AlreadyAuthorized = 'User is already authorized.',
  UnauthorizedPhoneNumber = 'Phone number in request does not match the authenticated user’s phone number',
  AccessDenied = 'Access Denied. You are not authorized to perform this action.',
  EntityAccessDenied = 'Access Denied. You don\'t have permission to access this',
  MissingOrInvalidToken = 'Missing or invalid Progress/Access token. Please provide a valid one.',
}

export enum NotFoundMessages {
  Vehicle = 'Vehicle not found.',
  VehicleModel = 'Vehicle model not found.',
  User = 'User not found.',
  MatchedTrip = 'No matched trip found for this package.'
}

export enum BadRequestMessages {
  BasePackageStatus = 'You can not perform this action for a package with status ',
  InvalidPrice = 'The final price cannot be set lower than the suggested price.',
  BaseTripStatus = 'You can not perform this action for a trip with status ',
  SendRequestPackage = 'You can not send request for this package.',
  SendRequestTrip = 'You can not send request to this trip.',
}
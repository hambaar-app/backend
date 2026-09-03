export interface AccessTokenPayload {
  sub: string;
  phoneNumber: string;
}

export interface TemporaryTokenPayload {
  phoneNumber: string;
}

export interface ProgressTokenPayload {
  sub: string;
  phoneNumber: string;
}

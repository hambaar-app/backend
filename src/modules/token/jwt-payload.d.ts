import 'jsonwebtoken';

declare module 'jsonwebtoken' {
  interface JwtPayload {
    sub?: string;
    phoneNumber: string;
  }
}

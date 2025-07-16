import 'jsonwebtoken';
import { Roles } from 'src/common/enums/auth.enum';

declare module 'jsonwebtoken' {
  interface JwtPayload {
    sub: string;
    phoneNumber: string;
    role?: Roles;
  }
}
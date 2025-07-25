import 'express-session';
import { UserStatesEnum } from './auth.enums';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    phoneNumber?: string;
    userState?: UserStatesEnum;
    accessToken: string;
    lastAccessed: Date;
    destroy(callback?: (err: any) => void): void;
  }
}

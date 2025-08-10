import 'express-session';
import { UserStatesEnum } from './auth.enums';
import { MatchResult } from 'src/modules/package/matching.service';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    phoneNumber?: string;
    userState?: UserStatesEnum;
    accessToken: string;
    lastAccessed: Date;
    packages: {
      id: string;
      lastCheckMatching?: Date;
      matchResults: MatchResult[];
    }[]
    destroy(callback?: (err: any) => void): void;
  }
}

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    accessToken: string;
    lastAccessed: Date;
    destroy(callback?: (err: any) => void): void;
  }
}
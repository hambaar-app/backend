import { Express } from 'express';
import { SessionData } from 'express-session';

declare global {
  namespace Express {
    interface Request {
      session: SessionData;
      user?: {
        id?: string;
        phoneNumber: string;
      };
    }
  }
}
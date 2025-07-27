import { Express } from 'express';
import { SessionData } from 'express-session';
import { RolesEnum } from 'generated/prisma';

declare global {
  namespace Express {
    interface Request {
      session: SessionData;
      user?: {
        id: string;
        phoneNumber?: string;
        role?: RolesEnum;
      };
    }
  }
}
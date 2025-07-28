import { Express } from 'express';
import { SessionData } from 'express-session';
import { RolesEnum, User } from 'generated/prisma';

declare global {
  namespace Express {
    interface Request {
      session: SessionData;
      user?: Partial<User>;
    }
  }
}
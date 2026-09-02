import { SessionData } from 'express-session';
import { User } from 'generated/prisma';

declare global {
  namespace Express {
    interface Request {
      session: SessionData;
      user?: Partial<User>;
    }
  }
}

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers['x-request-id'] as string | undefined;
    const requestId = incoming ?? crypto.randomUUID();
    (req as any).id = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}

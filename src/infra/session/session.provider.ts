import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import * as session from 'express-session';
import { RedisStore } from 'connect-redis';
import { CookieNames } from '../../common/enums/cookies.enum';
import { SESSION_STORE_PROVIDER } from './session.constants';

export interface SessionBundle {
  client: RedisClientType;
  store: RedisStore;
  middleware: ReturnType<typeof session>;
}

/**
 * Creates the session middleware bundle: a connected Redis client, a
 * connect-redis store, and an express-session middleware wired to the session
 * secret and cookie settings from config. Registers onApplicationShutdown to
 * quit the Redis client cleanly.
 */
export const sessionBundleProvider: Provider = {
  provide: SESSION_STORE_PROVIDER,
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<SessionBundle> => {
    const logger = new Logger('SessionProvider');

    const redisClient = createClient({
      url: config.getOrThrow<string>('SESSION_REDIS_URL'),
    });
    await redisClient.connect();

    const store = new RedisStore({
      client: redisClient as any,
      prefix: 'user-session',
    });

    const DAY_MS = 24 * 3600 * 1000;
    const maxAge = config.get<number>('COOKIE_MAX_AGE', 15 * DAY_MS);
    const isProduction = config.get<string>('NODE_ENV') === 'production';

    const middleware = session({
      name: CookieNames.SessionId,
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      store,
      cookie: {
        httpOnly: true,
        secure: config.get<string>('COOKIE_SECURE') === 'true' || isProduction,
        sameSite: 'strict',
        maxAge,
        path: '/',
      },
    });

    const client = redisClient as RedisClientType;
    const origQuit = client.quit.bind(client);
    client.quit = async () => {
      logger.log('Closing session Redis connection...');
      return origQuit();
    };

    return { client, store, middleware };
  },
};

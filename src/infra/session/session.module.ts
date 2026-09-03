import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  Inject,
  Logger,
} from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { sessionBundleProvider } from './session.provider';
import { SESSION_STORE_PROVIDER } from './session.constants';
import { SessionBundle } from './session.provider';

/**
 * Global session module. Wires cookie-parser BEFORE the session middleware
 * (fixes B-7 parser order). The configure() is synchronous — all async work
 * is done in the session provider factory.
 */
@Global()
@Module({
  providers: [sessionBundleProvider],
})
export class SessionModule implements NestModule {
  private readonly logger = new Logger(SessionModule.name);

  constructor(
    @Inject(SESSION_STORE_PROVIDER)
    private readonly bundle: SessionBundle,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes('*');

    consumer.apply(this.bundle.middleware).forRoutes('*');
  }

  async onApplicationShutdown() {
    this.logger.log('Shutting down session module...');
    await this.bundle.client.quit();
  }
}


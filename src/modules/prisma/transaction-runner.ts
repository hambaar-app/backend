import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../generated/prisma';
import { ConfigKey } from '../../common/config/config-names';
import { PrismaService } from './prisma.service';
import { PrismaTransaction } from './prisma.types';

/** Default interactive-transaction timeout when none is configured (ms). */
const DEFAULT_TX_TIMEOUT_MS = 5000;

/**
 * Thrown when a transaction exceeds its configured timeout (Prisma P2028).
 * All other transaction errors are rethrown untouched — mapping Prisma errors
 * to HTTP responses stays the responsibility of the global exceptions filter.
 */
export class TransactionTimedOutError extends Error {
  constructor(timeoutMs: number) {
    super(`Transaction exceeded the configured timeout of ${timeoutMs}ms`);
    this.name = 'TransactionTimedOutError';
  }
}

export interface TransactionRunnerOptions {
  /** Override the configured default timeout (ms) for this transaction. */
  timeoutMs?: number;
  /** Explicit isolation level — `run()` leaves it at the engine default. */
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

type TransactionFn<T> = (tx: PrismaTransaction) => Promise<T>;

function isTransactionTimeoutError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2028'
  );
}

/**
 * Single entry point for interactive Prisma transactions.
 *
 * Services should run multi-statement writes through this runner instead of
 * calling `prisma.$transaction` directly so that:
 * - the timeout is centralized and configurable (`PRISMA_TX_TIMEOUT_MS`);
 * - timeouts surface as a typed `TransactionTimedOutError` (P2028);
 * - code-minting flows can opt into `runIsolated` (serializable) so unique
 *   constraint retries under concurrency are safe.
 */
@Injectable()
export class TransactionRunner {
  private readonly defaultTimeoutMs: number;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.defaultTimeoutMs = config.get<number>(
      ConfigKey.Database.TransactionTimeoutMs,
      DEFAULT_TX_TIMEOUT_MS,
    );
  }

  /** Run `fn` inside one interactive transaction (engine-default isolation). */
  run<T>(
    fn: TransactionFn<T>,
    options: TransactionRunnerOptions = {},
  ): Promise<T> {
    return this.execute(fn, options);
  }

  /**
   * Run `fn` inside a serializable transaction. Use for flows that mint
   * unique codes or read-then-write shared rows, where concurrent
   * transactions must not interleave.
   */
  runIsolated<T>(
    fn: TransactionFn<T>,
    options: TransactionRunnerOptions = {},
  ): Promise<T> {
    return this.execute(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      ...options,
    });
  }

  private execute<T>(
    fn: TransactionFn<T>,
    { timeoutMs, isolationLevel }: TransactionRunnerOptions,
  ): Promise<T> {
    const timeout = timeoutMs ?? this.defaultTimeoutMs;
    return this.prisma
      .$transaction(fn, { timeout, isolationLevel })
      .catch((error: unknown) => {
        if (isTransactionTimeoutError(error)) {
          throw new TransactionTimedOutError(timeout);
        }
        throw error;
      });
  }
}

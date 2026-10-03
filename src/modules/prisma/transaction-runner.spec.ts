import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { TransactionRunner } from './transaction-runner';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('TransactionRunner', () => {
  let runner: TransactionRunner;
  let prisma: DeepMockProxy<PrismaService>;
  let config: DeepMockProxy<ConfigService>;

  const createRunner = async (timeoutMs?: number) => {
    config.get.mockImplementation((key: string, defaultValue?: unknown) => {
      if (
        timeoutMs !== undefined &&
        key === 'PRISMA_TX_TIMEOUT_MS'
      ) {
        return timeoutMs;
      }
      return defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionRunner,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    return module.get<TransactionRunner>(TransactionRunner);
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma = mockDeep<PrismaService>();
    config = mockDeep<ConfigService>();
    // jest-mock-extended returns undefined by default; make $transaction
    // actually invoke the callback like Prisma does.
    (prisma.$transaction as unknown as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
    );
    runner = await createRunner();
  });

  it('delegates to $transaction with the default timeout', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    const result = await runner.run(fn);

    expect(result).toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledWith(fn, {
      timeout: 5000,
      isolationLevel: undefined,
    });
  });

  it('uses the configured timeout from PRISMA_TX_TIMEOUT_MS', async () => {
    runner = await createRunner(12345);
    const fn = jest.fn().mockResolvedValue('ok');

    await runner.run(fn);

    expect(prisma.$transaction).toHaveBeenCalledWith(fn, {
      timeout: 12345,
      isolationLevel: undefined,
    });
  });

  it('honors a per-call timeout override', async () => {
    const fn = jest.fn().mockResolvedValue(1);

    await runner.run(fn, { timeoutMs: 250 });

    expect(prisma.$transaction).toHaveBeenCalledWith(fn, {
      timeout: 250,
      isolationLevel: undefined,
    });
  });

  it('runIsolated forces serializable isolation unless overridden', async () => {
    const fn = jest.fn().mockResolvedValue(1);

    await runner.runIsolated(fn);
    expect(prisma.$transaction).toHaveBeenLastCalledWith(fn, {
      timeout: 5000,
      isolationLevel: 'Serializable',
    });

    await runner.runIsolated(fn, {
      isolationLevel: 'ReadCommitted' as never,
    });
    expect(prisma.$transaction).toHaveBeenLastCalledWith(fn, {
      timeout: 5000,
      isolationLevel: 'ReadCommitted',
    });
  });

  it('propagates the transaction result and rethrows non-timeout errors untouched', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(runner.run(fn)).rejects.toThrow('boom');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('maps P2028 to TransactionTimedOutError with the effective timeout', async () => {
    const p2028 = Object.assign(new Error('Timed out fetching a new page'), {
      code: 'P2028',
    });
    const fn = jest.fn().mockRejectedValue(p2028);

    await expect(runner.run(fn)).rejects.toMatchObject({
      name: 'TransactionTimedOutError',
      message: 'Transaction exceeded the configured timeout of 5000ms',
    });
  });

  it('maps P2028 to TransactionTimedOutError with the override timeout in the message', async () => {
    const p2028 = Object.assign(new Error('Timed out'), { code: 'P2028' });
    const fn = jest.fn().mockRejectedValue(p2028);

    await expect(runner.run(fn, { timeoutMs: 250 })).rejects.toMatchObject({
      message: 'Transaction exceeded the configured timeout of 250ms',
    });
  });
});

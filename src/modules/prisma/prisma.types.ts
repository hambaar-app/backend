import { Prisma, PrismaClient } from 'generated/prisma';
import { DefaultArgs } from 'generated/prisma/runtime/library';

export type PrismaTransaction = Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
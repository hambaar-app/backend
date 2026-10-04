import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionRunner } from '../prisma/transaction-runner';
import { NotFoundMessages } from '../../common/enums/messages.enum';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { UserService } from '../user/user.service';

/**
 * Support operations (Phase 5 Task 3).
 *
 * Writes run through `TransactionRunner`; no manual `.catch` — the global
 * filter maps Prisma errors. `updateTransporterVerification` throws 404 when
 * the transporter has no verification status yet (was an unhandled 500 from
 * a null id reaching Prisma) — breaking change 5.1.
 */
@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private runner: TransactionRunner,
  ) {}

  // TODO: GETs

  async updateVerification(id: string, verificationDto: UpdateVerificationDto) {
    return this.prisma.verificationStatus.update({
      where: { id },
      data: verificationDto,
    });
  }

  async updateTransporterVerification(
    userId: string,
    verificationDto: UpdateVerificationDto,
  ) {
    return this.runner.run(async (tx) => {
      const transporter = await this.userService.getTransporter({ userId }, tx);
      if (!transporter.verificationStatusId) {
        throw new NotFoundException(NotFoundMessages.VerificationStatus);
      }
      return tx.verificationStatus.update({
        where: {
          id: transporter.verificationStatusId,
        },
        data: verificationDto,
      });
    });
  }
}

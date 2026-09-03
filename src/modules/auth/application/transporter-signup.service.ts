import { Injectable } from '@nestjs/common';
import { RolesEnum } from '../../../../generated/prisma';
import { NotificationMessages } from '../../notification/notification-messages';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../../token/token.service';
import { SignupSenderDto } from '../dto/signup-sender.dto';
import { SignupTransporterDto } from '../dto/signup-transporter.dto';

/**
 * Orchestrates the multi-step signup flows (sender + transporter).
 *
 * Each multi-write operation runs in a single Prisma transaction. Error
 * wrapping is handled by the global AllExceptionsFilter — services throw
 * only domain/Nest exceptions (A-3: no .catch(formatPrismaError) here).
 */
@Injectable()
export class TransporterSignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly notificationService: NotificationService,
  ) {}

  async signupSender(dto: SignupSenderDto) {
    return this.prisma.$transaction(async (tx) => {
      const sender = await tx.user.create({
        data: {
          ...dto,
          wallet: { create: {} },
          role: RolesEnum.sender,
          phoneVerifiedAt: new Date(),
        },
      });

      const accessToken = this.tokenService.generateAccessToken({
        sub: sender.id,
        phoneNumber: sender.phoneNumber,
      });

      await this.notificationService.create(
        sender.id,
        { content: NotificationMessages.Welcome },
        tx,
      );

      return { sender, accessToken };
    });
  }

  async signupTransporter(dto: SignupTransporterDto) {
    const {
      nationalId,
      licenseNumber,
      licenseExpiryDate,
      licenseType,
      profilePictureKey,
      ...userData
    } = dto;

    return this.prisma.$transaction(async (tx) => {
      const transporter = await tx.user.create({
        data: {
          ...userData,
          wallet: { create: {} },
          role: RolesEnum.transporter,
          transporter: {
            create: {
              nationalId,
              licenseNumber,
              licenseExpiryDate,
              licenseType,
              profilePictureKey,
              nationalIdStatus: { create: {} },
              licenseStatus: { create: {} },
              verificationStatus: { create: {} },
            },
          },
        },
        include: { transporter: true },
      });

      const progressToken = this.tokenService.generateProgressToken({
        sub: transporter.id,
        phoneNumber: transporter.phoneNumber,
      });

      await this.notificationService.create(
        transporter.id,
        { content: NotificationMessages.Welcome },
        tx,
      );

      return {
        transporter: {
          ...transporter,
          ...transporter.transporter,
          transporter: undefined,
        },
        progressToken,
      };
    });
  }
}

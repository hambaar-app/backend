import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '../../../generated/prisma';
import { UpdateTransporterDto } from './dto/update-transporter.dto';
import { PrismaTransaction } from '../prisma/prisma.types';
import { UpdateUserDto } from './dto/update-user.dto';
import { formatPrismaError } from '../../common/utilities';

export const S3_STORAGE_PORT = Symbol('S3_STORAGE_PORT');

/**
 * Minimal interim storage port so UserService stays testable without a
 * real S3 client. Phase 5 replaces this with the full StoragePort.
 */
export interface S3StoragePort {
  generateGetPresignedUrl(key: string | undefined | null): Promise<string>;
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(S3_STORAGE_PORT) private readonly storage: S3StoragePort,
  ) {}

  async get(
    userWhereInput: Prisma.UserWhereInput,
    tx: PrismaService | PrismaTransaction = this.prisma,
  ) {
    return tx.user.findFirst({
      where: userWhereInput,
    });
  }

  async getByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.get({ phoneNumber });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.user
      .findUniqueOrThrow({
        where: { id: userId },
        include: {
          transporter: {
            include: {
              licenseStatus: true,
              nationalIdStatus: true,
              verificationStatus: true,
            },
          },
        },
      })
      .catch((error: Error) => {
        formatPrismaError(error);
        throw error;
      });

    return {
      ...profile,
      transporter: {
        ...profile.transporter,
        profilePictureUrl: await this.storage.generateGetPresignedUrl(
          profile.transporter?.profilePictureKey,
        ),
        licenseDocumentUrl: await this.storage.generateGetPresignedUrl(
          profile.transporter?.licenseDocumentKey,
        ),
        nationalIdDocumentUrl: await this.storage.generateGetPresignedUrl(
          profile.transporter?.nationalIdDocumentKey,
        ),
      },
    };
  }

  async update(
    id: string,
    { phoneNumber: _phoneNumber, ...userDto }: UpdateUserDto,
  ) {
    // NOTE: phoneNumber is intentionally stripped from user updates (phone changes go through OTP flow — see auth module)
    return this.prisma.user
      .update({
        where: { id },
        data: userDto,
      })
      .catch((error: Error) => {
        formatPrismaError(error);
        throw error;
      });
  }

  async getTransporter(
    transporterWhereInput: Prisma.TransporterWhereInput,
    tx: PrismaService | PrismaTransaction = this.prisma,
  ) {
    return tx.transporter
      .findFirstOrThrow({
        where: transporterWhereInput,
        include: {
          user: true,
          nationalIdStatus: true,
          licenseStatus: true,
          verificationStatus: true,
          vehicles: {
            include: {
              verificationStatus: true,
            },
          },
        },
      })
      .catch((error: Error) => {
        formatPrismaError(error);
        throw error;
      });
  }

  async updateTransporter(
    userId: string,
    transporterDto: UpdateTransporterDto,
    tx: PrismaService | PrismaTransaction = this.prisma,
  ) {
    const updatedData: Prisma.TransporterUpdateInput = transporterDto;

    if (transporterDto.nationalId) {
      updatedData.nationalIdStatus = {
        create: {
          status: 'pending',
          description: null,
        },
      };
    }

    if (transporterDto.licenseNumber) {
      updatedData.nationalIdStatus = {
        create: {
          status: 'pending',
          description: null,
        },
      };
    }

    return tx.transporter
      .update({
        where: {
          userId,
        },
        data: updatedData,
        include: {
          nationalIdStatus: true,
          licenseStatus: true,
        },
      })
      .catch((error: Error) => {
        formatPrismaError(error);
        throw error;
      });
  }
}

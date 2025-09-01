import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '../../../generated/prisma';
import { UpdateTransporterDto } from './dto/update-transporter.dto';
import { PrismaTransaction } from '../prisma/prisma.types';
import { formatPrismaError } from '../../common/utilities';
import { UpdateUserDto } from './dto/update-user.dto';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service
  ) {}

  async get(
    userWhereInput: Prisma.UserWhereInput,
    tx: PrismaService | PrismaTransaction = this.prisma
  ) {
    return tx.user.findFirst({
      where: userWhereInput
    });
  }

  async getByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.get({ phoneNumber });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        transporter: {
          include: {
            licenseStatus: true,
            nationalIdStatus: true,
            verificationStatus: true
          }
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    return {
      ...profile,
      transporter: {
        ...profile.transporter,
        profilePictureUrl: await this.s3Service.generateGetPresignedUrl(profile.transporter?.profilePictureKey),
        licenseDocumentUrl: await this.s3Service.generateGetPresignedUrl(profile.transporter?.licenseDocumentKey),
        nationalIdDocumentUrl: await this.s3Service.generateGetPresignedUrl(profile.transporter?.nationalIdDocumentKey),
      }
    };
  }

  async update(id: string, { phoneNumber, ...userDto }: UpdateUserDto) {
    // TODO
    return this.prisma.user.update({
      where: { id },
      data: userDto
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getTransporter(
    transporterWhereInput: Prisma.TransporterWhereInput,
    tx: PrismaService | PrismaTransaction = this.prisma
  ) {
    return tx.transporter.findFirstOrThrow({
      where: transporterWhereInput,
      include: {
        user: true,
        nationalIdStatus: true,
        licenseStatus: true,
        verificationStatus: true,
        vehicles: {
          include: {
            verificationStatus: true
          }
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async updateTransporter(
    userId: string,
    transporterDto: UpdateTransporterDto,
    tx: PrismaService | PrismaTransaction = this.prisma
  ) {
    const updatedData: Prisma.TransporterUpdateInput = transporterDto;

    if (transporterDto.nationalId) {
      updatedData.nationalIdStatus = {
        create: {
          status: 'pending',
          description: null,
        }
      };
    }

    if (transporterDto.licenseNumber) {
      updatedData.nationalIdStatus = {
        create: {
          status: 'pending',
          description: null,
        }
      };
    }

    return tx.transporter.update({
      where: {
        userId
      },
      data: updatedData,
      include: {
        nationalIdStatus: true,
        licenseStatus: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }
}

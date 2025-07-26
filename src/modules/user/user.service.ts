import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from 'generated/prisma';
import { UpdateTransporterDto } from './dto/update-transporter.dto';
import { PrismaTransaction } from '../prisma/prisma.types';
import { formatPrismaError } from 'src/common/utilities';
import { TransporterResponseDto } from './dto/transporter-response.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

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
    }) as Promise<TransporterResponseDto>;
  }

  async updateTransporter(
    userId: string,
    transporterDto: UpdateTransporterDto,
    tx: PrismaService | PrismaTransaction = this.prisma
  ) {
    return tx.transporter.update({
      where: {
        userId
      },
      data: transporterDto
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Transporter, User } from 'generated/prisma';
import { UpdateTransporterDto } from './dto/update-transporter.dto';
import { PrismaTransaction } from '../prisma/prisma.types';
import { formatPrismaError } from 'src/common/utilities';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async get(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
    userInclude: Prisma.UserInclude = { transporter: true },
    tx: PrismaService | PrismaTransaction = this.prisma
  ): Promise<User | null> {
    return tx.user.findUnique({
      where: userWhereUniqueInput,
      include: userInclude
    });
  }

  async getByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.get({ phoneNumber });
  }

  async getTransporter(
    transporterWhereUniqueInput: Prisma.TransporterWhereUniqueInput,
    transporterInclude?: Prisma.TransporterInclude,
    tx: PrismaService | PrismaTransaction = this.prisma
  ): Promise<Transporter | null> {
    return tx.transporter.findUniqueOrThrow({
      where: transporterWhereUniqueInput,
      include: transporterInclude
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

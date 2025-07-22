import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from 'generated/prisma';
import { UpdateTransporterDto } from './dto/update-transporter.dto';
import { PrismaTransaction } from '../prisma/prisma.types';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async get(userWhereUniqueInput: Prisma.UserWhereUniqueInput): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
      include: {
        transporter: true
      }
    });
  }

  async getByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.get({ phoneNumber });
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
    });
  }
}

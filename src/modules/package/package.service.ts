import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { AuthMessages, BadRequestMessages } from 'src/common/enums/messages.enum';
import { formatPrismaError } from 'src/common/utilities';
import { UpdatePackageDto } from './dto/update.package.dto';
import { PackageStatusEnum } from 'generated/prisma';

@Injectable()
export class PackageService {
  constructor(
    private prisma: PrismaService
  ) {}

  async createRecipient(
    userId: string,
    {
      address, ...recipientDto
    }: CreateRecipientDto
  ) {
    return this.prisma.packageRecipient.create({
      data: {
        ...recipientDto,
        address: {
          create: {
            userId,
            ...address,
            title: address.title ?? recipientDto.fullName,
          }
        }
      },
      include: {
        address: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getAllRecipients(userId: string, isHighlighted = true) {
    return this.prisma.packageRecipient.findMany({
      where: {
        address: {
          userId
        },
        isHighlighted
      },
      include: {
        address: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async create(
    userId: string,
    {
      items,
      originAddressId,
      recipientId,
      ...packageDto
    }: CreatePackageDto
  ) {
    return this.prisma.$transaction(async tx => {
      const originAddress = await tx.address.findFirst({
        where: {
          id: originAddressId,
          userId,
        }
      });

      if (!originAddress) {
        throw new ForbiddenException(`${AuthMessages.EntityAccessDenied} origin address.`);
      }

      const recipient = await tx.packageRecipient.findFirst({
        where: {
          id: recipientId,
          address: {
            userId
          }
        }
      });

      if (!recipient) {
        throw new ForbiddenException(`${AuthMessages.EntityAccessDenied} recipient.`);
      }

      return tx.package.create({
        data: {
          senderId: userId,
          items,
          originAddressId: originAddress.id,
          recipientId: recipient.id,
          ...packageDto
        },
        include: {
          originAddress: true,
          recipient: {
            include: {
              address: true
            }
          }
        }
      });
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getAll(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.prisma.package.findMany({
      where: {
        senderId: userId
      },
      include: {
        recipient: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
  }

  async getById(id: string) {
    return this.prisma.package.findFirstOrThrow({
      where: { id },
      include: {
        originAddress: true,
        recipient: {
          include: {
            address: true
          }
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async update(id: string, packageDto: UpdatePackageDto) {
    return this.prisma.$transaction(async tx => {
      const { shippingStatus } = await tx.package.findFirstOrThrow({
        where: { id },
        select: { shippingStatus: true }
      }).catch((error: Error) => {
        formatPrismaError(error);
        throw error;
      });

      const isValidStatus = shippingStatus === PackageStatusEnum.created || 
                     shippingStatus === PackageStatusEnum.searching_transporter;
      if (!isValidStatus) {
        throw new BadRequestException(`${BadRequestMessages.BasePackageStatus} ${shippingStatus}.`);
      }

      return this.prisma.package.update({
        where: { id },
        data: packageDto
      });
    });
  }
}

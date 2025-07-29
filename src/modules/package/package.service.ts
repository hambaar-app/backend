import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { AuthMessages } from 'src/common/enums/messages.enum';
import { formatPrismaError } from 'src/common/utilities';

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
          recipient: true
        }
      });
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }
}

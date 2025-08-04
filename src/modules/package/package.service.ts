import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { AuthMessages, BadRequestMessages } from 'src/common/enums/messages.enum';
import { formatPrismaError } from 'src/common/utilities';
import { UpdatePackageDto } from './dto/update.package.dto';
import { PackageStatusEnum } from 'generated/prisma';
import { MapService } from '../map/map.service';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class PackageService {
  constructor(
    private prisma: PrismaService,
    private mapService: MapService,
    private pricingService: PricingService
  ) {}

  async createRecipient(
    userId: string,
    {
      address: {
        cityId,
        ...address
      },
      ...recipientDto
    }: CreateRecipientDto
  ) {
    return this.prisma.$transaction(async tx => {
      const city = await tx.city.findUniqueOrThrow({
        where: { id: cityId },
        include: {
          province: true
        }
      });

      return tx.packageRecipient.create({
        data: {
          ...recipientDto,
          address: {
            create: {
              userId,
              ...address,
              title: address.title ?? recipientDto.fullName,
              province: city.province.persianName,
              city: city.persianName,
            }
          }
        },
        include: {
          address: true
        }
      });
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
        },
        include: {
          address: true
        }
      });

      if (!recipient) {
        throw new ForbiddenException(`${AuthMessages.EntityAccessDenied} recipient.`);
      }

      // Calculate distance for pricing
      const { distance } = await this.mapService.calculateDistance({
        vehicleType: 'car',
        tripType: 'intercity',
        origin: {
          latitude: originAddress.latitude!,
          longitude: originAddress.longitude!
        },
        destination: {
          latitude: recipient.address.latitude!,
          longitude: recipient.address.longitude!
        }
      });

      const { suggestedPrice } = this.pricingService.calculateSuggestedPrice({
          distanceKm: distance,
          weightKg: packageDto.weight,
          isFragile: packageDto.isFragile ?? false,
          isPerishable: packageDto.isPerishable ?? false,
          originCity: originAddress.city!,
          destinationCity: recipient.address.city!
      });

      return tx.package.create({
        data: {
          senderId: userId,
          items,
          originAddressId: originAddress.id,
          recipientId: recipient.id,
          ...packageDto,
          suggestedPrice,
          finalPrice: suggestedPrice
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
        senderId: userId,
        deletedAt: null
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
      where: {
        id,
        deletedAt: null
      },
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
      const { shippingStatus, suggestedPrice } = await tx.package.findFirstOrThrow({
        where: {
          id,
          deletedAt: null
        },
        select: {
          shippingStatus: true,
          suggestedPrice: true
        }
      });

      const isValidStatus = shippingStatus === PackageStatusEnum.created || 
                     shippingStatus === PackageStatusEnum.searching_transporter;
      if (!isValidStatus) {
        throw new BadRequestException(`${BadRequestMessages.BasePackageStatus} ${shippingStatus}.`);
      }

      if (packageDto.finalPrice < suggestedPrice) {
        throw new BadRequestException(BadRequestMessages.InvalidPrice);
      }

      return this.prisma.package.update({
        where: { id },
        data: packageDto
      });
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });;
  }

  async delete(id: string) {
    return this.prisma.$transaction(async tx => {
      const { shippingStatus } = await tx.package.findFirstOrThrow({
        where: { id },
        select: { shippingStatus: true }
      });

      const isValidStatus = shippingStatus === PackageStatusEnum.created || 
                     shippingStatus === PackageStatusEnum.searching_transporter;
      if (!isValidStatus) {
        throw new BadRequestException(`${BadRequestMessages.BasePackageStatus} ${shippingStatus}.`);
      }

      return this.prisma.package.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }
}

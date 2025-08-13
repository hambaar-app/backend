import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { AuthMessages, BadRequestMessages } from 'src/common/enums/messages.enum';
import { formatPrismaError } from 'src/common/utilities';
import { UpdatePackageDto } from './dto/update.package.dto';
import { PackageStatusEnum, RequestStatusEnum } from 'generated/prisma';
import { MapService } from '../map/map.service';
import { PricingService } from '../pricing/pricing.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class PackageService {
  constructor(
    private prisma: PrismaService,
    private mapService: MapService,
    private pricingService: PricingService,
    private s3Service: S3Service
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

  async getAllRecipients(userId: string, search?: string, isHighlighted = true) {
    return this.prisma.packageRecipient.findMany({
      where: {
        address: {
          userId
        },
        isHighlighted,
        OR: [
          {
            fullName: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            address: {
              title: {
                contains: search,
                mode: 'insensitive'
              }
            }
          }
        ]
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
        origins: [{
          latitude: originAddress.latitude!,
          longitude: originAddress.longitude!
        }],
        destinations: [{
          latitude: recipient.address.latitude!,
          longitude: recipient.address.longitude!
        }]
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

  async getById(id: string) {
    const packageData = await this.prisma.package.findFirstOrThrow({
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
        },
        deliveryRequests: true,
        matchedRequest: {
          include: {
            transporter: true,
            trackingUpdates: true
          }
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    if (packageData.picturesKey && Array.isArray(packageData.picturesKey)) {
      const keys = packageData.picturesKey;
      const presignedUrls = await Promise.all(
        keys.map(async (key, index) => {
          const keyString = JSON.stringify(key).split('"')[1];          
          try {
            if (keyString) {
              return this.s3Service.generateGetPresignedUrl(keyString);
            }
            return '';
          } catch (urlError) {
            console.error(`Failed to generate presigned URL for picturesKey[${index}]:`, urlError);
            return '';
          }
        })
      );

      packageData.picturesKey = {
        keys,
        presignedUrls
      };
    }

    return packageData;
  }

  async getAll(
    userId: string,
    status: PackageStatusEnum[] = [
      PackageStatusEnum.created,
      PackageStatusEnum.searching_transporter,
      PackageStatusEnum.matched,
      PackageStatusEnum.picked_up,
      PackageStatusEnum.in_transit,
    ],
    page = 1, limit = 10
  ) {
    const skip = (page - 1) * limit;
    const packages = await this.prisma.package.findMany({
      where: {
        senderId: userId,
        status: {
          in: status
        },
        deletedAt: null
      },
      include: {
        originAddress: true,
        recipient: {
          include: {
            address: true
          }
        },
        matchedRequest: true, // TODO: Improve it later
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    const packagesWithUrls = await Promise.all(
      packages.map(async (packageData) => {
        const keys = packageData.picturesKey;

        if (keys && Array.isArray(keys)) {
          const presignedUrls = await Promise.all(
            keys.map(async (key, index) => {
              const keyString = JSON.stringify(key).split('"')[1];
              try {
                if (keyString) {
                  return this.s3Service.generateGetPresignedUrl(keyString);
                }
                return '';
              } catch (urlError) {
                console.error(`Failed to generate presigned URL for picturesKey[${index}]:`, urlError);
                return '';
              }
            })
          );

          return {
            ...packageData,
            picturesKey: {
              keys,
              presignedUrls
            }
          };
        }
      })
    );

    return packagesWithUrls;
  }

  async update(id: string, packageDto: UpdatePackageDto) {
    return this.prisma.$transaction(async tx => {
      const { status, suggestedPrice } = await tx.package.findFirstOrThrow({
        where: {
          id,
          deletedAt: null
        },
        select: {
          status: true,
          suggestedPrice: true
        }
      });

      const isValidStatus = status === PackageStatusEnum.created || 
                     status === PackageStatusEnum.searching_transporter;
      if (!isValidStatus) {
        throw new BadRequestException(`${BadRequestMessages.BasePackageStatus} ${status}.`);
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
      const { status } = await tx.package.findFirstOrThrow({
        where: { id },
        select: { status: true }
      });

      const isValidStatus = status === PackageStatusEnum.created || 
                     status === PackageStatusEnum.searching_transporter;
      if (!isValidStatus) {
        throw new BadRequestException(`${BadRequestMessages.BasePackageStatus} ${status}.`);
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

  async getAllPackageRequests(packageId: string) {
    return this.prisma.tripRequest.findMany({
      where: {
        packageId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async updateRequest(requestId: string) {
    return this.prisma.tripRequest.update({
      where: {
        id: requestId,
        status: RequestStatusEnum.pending
      },
      data: {
        status: RequestStatusEnum.canceled
      }
    });
  }
}

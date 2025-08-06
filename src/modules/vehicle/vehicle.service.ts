import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { formatPrismaError } from 'src/common/utilities';
import { CreateModelDto } from './dto/create-model.dto';
import { CreateVehicleDto, VehicleDocumentsDto, VehicleDocumentUrlsDto } from './dto/create-vehicle.dto';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PrismaTransaction } from '../prisma/prisma.types';
import { UserService } from '../user/user.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class VehicleService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private s3Service: S3Service
  ) {}

  async createBrand({ name }: CreateBrandDto) {
    return this.prisma.vehicleBrand.create({
      data: {
        name
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getAllBrands(search?: string) {
    return this.prisma.vehicleBrand.findMany({
      where: {
        name: {
          contains: search,
          mode: 'insensitive'
        }
      }
    });
  }

  async createModel(brandDto: CreateModelDto) {
    return this.prisma.vehicleModel.create({
      data: brandDto
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getAllBrandModels(brandId: string, search?: string) {
    return this.prisma.vehicleModel.findMany({
      where: {
        brandId,
        model: {
          contains: search,
          mode: 'insensitive'
        }
      }
    });
  }

  async create(
    userId: string,
    { verificationDocuments ,...vehicleDto }: CreateVehicleDto
  ) {
    return this.prisma.$transaction(async tx => {
      const { id: ownerId } = await this.userService.getTransporter({ userId }, tx);
    
      const plainDocs = instanceToPlain(verificationDocuments);
      const verificationStatus = await tx.verificationStatus.create({ data: {} }); // Nested create got an error :(

      return tx.vehicle.create({
        data: {
          ...vehicleDto,
          ownerId,
          verificationDocuments: plainDocs,
          verificationStatusId: verificationStatus.id,
          // verificationStatus: {
          //   create: {}
          // }
        }
      }).catch((error: Error) => {
        formatPrismaError(error);
        throw error;
      });
    });
  }

  async getById(
    id: string,
    tx: PrismaService | PrismaTransaction = this.prisma
  ) {
    const vehicle = await tx.vehicle.findUniqueOrThrow({
      where: { id }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    if (vehicle.verificationDocuments) {
      const documents = plainToInstance(VehicleDocumentsDto, vehicle.verificationDocuments);
      const presignedUrls: VehicleDocumentUrlsDto = {};

      const singleKeys = ['greenSheetKey', 'cardKey'] as const;
      await Promise.all(
        singleKeys.map(async ([key, s3Key]) => {
          const newKey = key.replace('Key', '');
          try {
            if (s3Key) {
              presignedUrls[newKey] = this.s3Service.generateGetPresignedUrl(s3Key);
            }
          } catch (urlError) {
            console.error(`Failed to generate presigned URL for ${key}:`, urlError);
            presignedUrls[newKey] = ''; // Set empty string for failed URLs
          }
        })
      );

      if (documents.vehiclePicsKey && Array.isArray(documents.vehiclePicsKey)) {
        presignedUrls.vehiclePics = await Promise.all(
          documents.vehiclePicsKey.map(async (s3Key, index) => {
            try {
              return this.s3Service.generateGetPresignedUrl(s3Key);
            } catch (urlError) {
              console.error(`Failed to generate presigned URL for vehiclePicsKey[${index}]:`, urlError);
              return '';
            }
          })
        );
      }

      vehicle.verificationDocuments = instanceToPlain({
        ...documents,
        presignedUrls
      });
    }

    return vehicle;
  }

  async getAllVehicles(userId: string) {    
    return this.prisma.vehicle.findMany({
      where: {
        owner: {
          userId
        }
      },
      include: {
        model: {
          include: {
            brand: true
          }
        },
        verificationStatus: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async update(
    id: string,
    { verificationDocuments, ...vehicleDto }: UpdateVehicleDto,
    tx: PrismaService | PrismaTransaction = this.prisma
  ) {
    const vehicle = await this.getById(id, tx);

    const oldDocs = plainToInstance(VehicleDocumentsDto, vehicle.verificationDocuments) ?? {};
    const newDocs = instanceToPlain(Object.assign(oldDocs, verificationDocuments));
    
    return tx.vehicle.update({
      where: { id },
      data: {
        verificationDocuments: newDocs,
        ...vehicleDto
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }
}

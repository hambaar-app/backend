import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { formatPrismaError } from 'src/common/utilities';
import { CreateModelDto } from './dto/create-model.dto';
import { CreateVehicleDto, VehicleDocumentsDto } from './dto/create-vehicle.dto';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PrismaTransaction } from '../prisma/prisma.types';
import { UserService } from '../user/user.service';

@Injectable()
export class VehicleService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService
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
    return tx.vehicle.findUniqueOrThrow({
      where: { id }
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

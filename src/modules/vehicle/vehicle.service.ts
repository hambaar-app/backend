import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { formatPrismaError } from 'src/common/utilities';
import { CreateModelDto } from './dto/create-model.dto';
import { CreateVehicleDto, VehicleDocumentsDto } from './dto/create-vehicle.dto';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PrismaTransaction } from '../prisma/prisma.types';

@Injectable()
export class VehicleService {
  constructor(private prisma: PrismaService) {}

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
    ownerId: string,
    { verificationDocuments ,...vehicleDto }: CreateVehicleDto
  ) {
    const plainDocs = instanceToPlain(verificationDocuments);
    return this.prisma.vehicle.create({
      data: {
        ownerId,
        verificationDocuments: plainDocs,
        ...vehicleDto
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
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
    { verificationDocuments ,...vehicleDto }: UpdateVehicleDto,
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

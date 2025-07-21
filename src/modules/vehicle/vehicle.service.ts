import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { formatPrismaError } from 'src/common/utilities';
import { CreateModelDto } from './dto/create-model.dto';

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
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { formatPrismaError } from 'src/common/utilities';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async getAllProvinces() {
    return this.prisma.province.findMany();
  }

  async getAllProvinceCities(provinceId: string) {
    return this.prisma.city.findMany({
      where: { provinceId }
    });
  }

  async create(
    userId: string,
    {
      cityId,
      ...addressDto
    }: CreateAddressDto
  ) {
    return this.prisma.$transaction(async tx => {
      const city = await tx.city.findUniqueOrThrow({
        where: { id: cityId },
        include: {
          province: true
        }
      });

      return this.prisma.address.create({
        data: {
          userId,
          ...addressDto,
          province: city.province.persianName,
          city: city.persianName,
        }
      });
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getAll(userId: string, isHighlighted = true) {
    return this.prisma.address.findMany({
      where: {
        userId,
        isHighlighted
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });;
  }

  async update(addressId: string, addressDto: UpdateAddressDto) {
    return this.prisma.address.update({
      where: {
        id: addressId
      },
      data: addressDto
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }
}

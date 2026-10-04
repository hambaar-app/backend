import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionRunner } from '../prisma/transaction-runner';
import { CityRepository } from '../prisma/repositories/city.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

/**
 * Address management (Phase 5 Task 3).
 *
 * Writes run through `TransactionRunner`; no manual `.catch` — the global
 * filter maps Prisma errors. City/province denormalization reads through
 * `CityRepository`. Fix vs the original: `create` writes the address
 * through `tx` (it used the root client inside the transaction).
 */
@Injectable()
export class AddressService {
  constructor(
    private prisma: PrismaService,
    private runner: TransactionRunner,
    private cities: CityRepository,
  ) {}

  async getAllProvinces() {
    return this.prisma.province.findMany();
  }

  async getAllProvinceCities(provinceId: string) {
    return this.prisma.city.findMany({
      where: { provinceId },
    });
  }

  async searchCitiesByName(search: string) {
    return this.prisma.city.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            englishName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      },
    });
  }

  async create(userId: string, { cityId, ...addressDto }: CreateAddressDto) {
    return this.runner.run(async (tx) => {
      const city = await this.cities.findCityWithProvince(cityId, tx);

      return tx.address.create({
        data: {
          userId,
          ...addressDto,
          province: city.province.name,
          city: city.name,
        },
      });
    });
  }

  async getAll(userId: string, search?: string, isHighlighted = true) {
    return this.prisma.address.findMany({
      where: {
        userId,
        isHighlighted,
        title: {
          contains: search,
          mode: 'insensitive',
        },
      },
    });
  }

  async update(addressId: string, addressDto: UpdateAddressDto) {
    return this.prisma.address.update({
      where: {
        id: addressId,
      },
      data: addressDto,
    });
  }
}

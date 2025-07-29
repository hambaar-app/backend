import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, addressDto: CreateAddressDto) {
    return this.prisma.address.create({
      data: {
        userId,
        ...addressDto
      }
    });
  }

  async update(addressId: string, addressDto: UpdateAddressDto) {
    return this.prisma.address.update({
      where: {
        id: addressId
      },
      data: addressDto
    });
  }
}

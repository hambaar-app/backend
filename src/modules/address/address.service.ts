import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';

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
}

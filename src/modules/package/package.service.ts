import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';

@Injectable()
export class PackageService {
  constructor(
    private prisma: PrismaService
  ) {}

  createRecipient(
    userId: string,
    {
      address, ...recipientDto
    }: CreateRecipientDto
  ) {
    return this.prisma.packageRecipient.create({
      data: {
        ...recipientDto,
        address: {
          create: {
            userId,
            ...address
          }
        }
      },
      include: {
        address: true
      }
    });
  }
}

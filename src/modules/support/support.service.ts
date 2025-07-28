import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateVerificationDto } from './dto/update-verification.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async updateVerification(
    id: string,
    verificationDto: UpdateVerificationDto
  ) {
    return this.prisma.verificationStatus.update({
      where: { id },
      data: verificationDto
    });
  }
}

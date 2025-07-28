import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService
  ) {}

  // TODO: GETs

  async updateVerification(
    id: string,
    verificationDto: UpdateVerificationDto
  ) {
    return this.prisma.verificationStatus.update({
      where: { id },
      data: verificationDto
    });
  }

  async updateTransporterVerification(
    userId: string,
    verificationDto: UpdateVerificationDto
  ) {
    return this.prisma.$transaction(async tx => {
      const transporter = await this.userService.getTransporter({ userId });
      return tx.verificationStatus.update({
        where: {
          id: transporter.verificationStatusId!
        },
        data: verificationDto
      });
    });
  }
}

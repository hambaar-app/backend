import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, content: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        content
      }
    });
  }
}

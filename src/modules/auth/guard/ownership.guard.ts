import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RolesEnum, User } from 'generated/prisma';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { OwnershipConfig } from '../types/auth.types';
import { AuthMessages } from 'src/common/enums/messages.enum';

// Just a mvp version

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<OwnershipConfig>(
      'ownership',
      context.getHandler(),
    );

    if (!config) {
      return true; // No ownership check required
    }

    const request = context.switchToHttp().getRequest() as Request;
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin can access all resources
    if (user.role === RolesEnum.admin) {
      return true;
    }

    const entityId = request.params[config.paramName ?? 'id'];
    if (!entityId) {
      throw new BadRequestException('Entity Id is required.');
    }

    const customWhere = this.getCustomWhere(config.entity, user.id, entityId);

    try {
      const record = await this.getEntityRecord(config.entity, customWhere);

      if (!record) {
        throw new ForbiddenException(
          `Access Denied. You don't have permission to access this ${config.entity}.`,
        );
      }

      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Ownership check error:', error);
      throw new ForbiddenException(AuthMessages.AccessDenied);
    }
  }

  // Entity customWhere mapping
  private getCustomWhere(
    entity: string,
    ownerId: string,
    entityId: string,
  ): Record<string, any> {
    const entityCustomWhereMap: Record<string, Record<string, any>> = {
      vehicle: {
        id: entityId,
        ownerId
      },
      address: {
        id: entityId,
        userId: ownerId
      }
      // ...
    };

    return entityCustomWhereMap[entity];
  }

  private async getEntityRecord(
    entity: string,
    customWhere: Record<string, any>,
  ): Promise<boolean> {
    const model = this.prisma[entity as keyof PrismaService] as any;

    if (!model || typeof model.findFirst !== 'function') {
      throw new Error(`Invalid entity: ${entity}`);
    }

    return model.findFirst({
      where: customWhere,
    });
  }
}

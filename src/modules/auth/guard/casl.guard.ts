import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { CaslAbilityFactory } from '../../casl/casl-ability.factory';
import { Reflector } from '@nestjs/core';
import { CheckPermissionsConfig } from '../../casl/casl.decorators';
import { Action, Subjects } from '../../casl/casl.types';
import { subject } from '@casl/ability';
import { Request } from 'express';
import { AuthMessages } from 'src/common/enums/messages.enum';

@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionConfig = this.reflector.get<CheckPermissionsConfig>(
      'permissions',
      context.getHandler(),
    );

    if (!permissionConfig) {
      return true; // No permission check required
    }

    const request = context.switchToHttp().getRequest() as Request;
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const ability = this.caslAbilityFactory.defineAbilityFor(user);
    const { action, subject: subjectType, field } = permissionConfig;

    // For create actions, check permission without entity data
    if (action === Action.Create) {
      const isAllowed = ability.can(action, subjectType);
      if (!isAllowed) {
        throw new ForbiddenException(`Access denied. Cannot ${action} ${subjectType}.`);
      }
      return true;
    }

    // For other actions, we need to get the entity and check permissions (TODO)
    const entityId = request.params.id;
    if (!entityId) {
      return true;
    }

    try {
      const entity = await this.getEntity(subjectType, entityId);

      if (!entity) {
        return true; // TODO
      }

      // Create a subject instance for CASL
      const subjectInstance = subject(subjectType as string, entity);

      const isAllowed = field
        ? ability.can(action, subjectInstance, field)
        : ability.can(action, subjectInstance);

      if (!isAllowed) {
        throw new ForbiddenException(`Access denied. Cannot ${action} ${subjectType}.`);
      }

      return true;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if (process.env.NODE_ENV === 'development') console.error('Permission check error:', error);
      throw new ForbiddenException(AuthMessages.AccessDenied);
    }
  }

  private async getEntity(
    subjectType: Subjects,
    id: string,
  ): Promise<any> {
    const entityMap: Record<string, any> = {
      User: () =>
        this.prisma.user.findFirst({
          where: { id, deletedAt: null },
          include: { transporter: true },
        }),
      Package: () =>
        this.prisma.package.findFirst({
          where: { id, deletedAt: null },
          include: {
            sender: true,
            originAddress: true,
            destinationAddress: true,
          },
        }),
      Address: () =>
        this.prisma.address.findFirst({
          where: { id, deletedAt: null },
        }),
      Wallet: () =>
        this.prisma.wallet.findFirst({
          where: { id, deletedAt: null },
        }),
      Transporter: () =>
        this.prisma.transporter.findFirst({
          where: { id, deletedAt: null },
        }),
      Vehicle: () =>
        this.prisma.vehicle.findFirst({
          where: { id, deletedAt: null },
          include: { owner: true },
        }),
      Trip: () =>
        this.prisma.trip.findFirst({
          where: { id, deletedAt: null },
          include: { transporter: true },
        }),
      Achievement: () =>
        this.prisma.achievement.findFirst({
          where: { id, deletedAt: null },
          include: { profile: true },
        }),
      DeliveryRequest: () =>
        this.prisma.deliveryRequest.findFirst({
          where: { id, deletedAt: null },
          include: { package: true, trip: { include: { transporter: true } } },
        }),
      MatchedRequest: () =>
        this.prisma.matchedRequest.findFirst({
          where: { id, deletedAt: null },
          include: { sender: true, transporter: true },
        }),
      Transaction: () =>
        this.prisma.transaction.findFirst({
          where: { id, deletedAt: null },
          include: { wallet: true },
        }),
      TrackingUpdate: () =>
        this.prisma.trackingUpdate.findFirst({
          where: { id, deletedAt: null },
          include: {
            matchedRequest: { include: { sender: true, transporter: true } },
          },
        }),
      PackageRecipient: () =>
        this.prisma.packageRecipient.findFirst({
          where: { id, deletedAt: null },
        }),
      VerificationStatus: () =>
        this.prisma.verificationStatus.findFirst({
          where: { id, deletedAt: null },
        }),
      VehicleBrand: () =>
        this.prisma.vehicleBrand.findFirst({
          where: { id, deletedAt: null },
        }),
      VehicleModel: () =>
        this.prisma.vehicleModel.findFirst({
          where: { id, deletedAt: null },
        }),
      TripWaypoint: () =>
        this.prisma.tripWaypoint.findFirst({
          where: { id, deletedAt: null },
          include: { trip: { include: { transporter: true } } },
        }),
    };

    const fetcher = entityMap[subjectType as string];
    if (!fetcher) {
      throw new Error(`Unknown subject type: ${subjectType}`);
    }

    return await fetcher();
  }
}

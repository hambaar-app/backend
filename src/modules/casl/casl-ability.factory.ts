import { AbilityBuilder } from '@casl/ability';
import { MatchStatusEnum, RequestStatusEnum, RolesEnum, User } from 'generated/prisma';
import { Action, AppAbility } from '../casl/casl.types';
import { Injectable } from '@nestjs/common';
import { createPrismaAbility } from '@casl/prisma';

@Injectable()
export class CaslAbilityFactory {
  defineAbilityFor(user: { id: string; role?: RolesEnum }): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

    // None authenticated user permissions
    can(Action.Read, 'VehicleBrand');
    can(Action.Read, 'VehicleModel');

    // Admin permissions - can do everything
    if (user.role === RolesEnum.admin) {
      can(Action.Manage, 'all');
      return build();
    }

    // Support permissions - limited admin access
    if (user.role === RolesEnum.support) {
      can(Action.Read, 'all');
      can(Action.Update, 'all');
      cannot(Action.Update, 'User', { role: { in: [RolesEnum.admin, RolesEnum.sender] } });

      return build();
    }

    // Base authenticated user permissions
    can(Action.Read, 'User', { id: user.id });
    can(Action.Update, 'User', { id: user.id });
    can(Action.Manage, 'Address', { userId: user.id });

    // Wallet permissions
    can(Action.Read, 'Wallet', { userId: user.id });
    can(Action.Read, 'Transaction', { wallet: { userId: user.id } });

    // Other common permissions
    // Achievements
    can(Action.Read, 'Achievement', { profile: { userId: user.id } });


    // Sender-specific permissions
    if (user.role === RolesEnum.sender) {
      // Package management
      can(Action.Create, 'Package');
      can(Action.Read, 'Package', { senderId: user.id });
      can(Action.Read, 'Package', { 
        senderId: user.id,
        // shippingStatus: { in: [PackageStatusEnum.created, PackageStatusEnum.searching_transporter] }
      });
      can(Action.Delete, 'Package', { 
        senderId: user.id,
        // shippingStatus: PackageStatusEnum.created
      });

      // Package recipients
      can(Action.Create, 'PackageRecipient');
      can(Action.Read, 'PackageRecipient');
      can(Action.Update, 'PackageRecipient');

      // Trips read
      can(Action.Read, 'Trip', {
        // tripStatus: { in: [TripStatusEnum.scheduled, TripStatusEnum.delayed] }
      });

      // Delivery requests
      can(Action.Create, 'DeliveryRequest');
      can(Action.Read, 'DeliveryRequest', { package: { senderId: user.id } });
      can(Action.Update, 'DeliveryRequest', 'senderNotes', { 
        package: { senderId: user.id },
        status: RequestStatusEnum.pending
      });
      can(Action.Delete, 'DeliveryRequest', { 
        package: { senderId: user.id },
        // status: { in: [RequestStatusEnum.pending, RequestStatusEnum.canceled]}
      });

      // Matched requests
      can(Action.Read, 'MatchedRequest', { senderId: user.id });
      can(Action.Update, 'MatchedRequest', ['senderRating', 'comment'], { 
        senderId: user.id,
        // matchStatus: { in: [MatchStatusEnum.completed] }
      });

      // Tracking updates
      can(Action.Read, 'TrackingUpdate', { matchedRequest: { senderId: user.id } });
    }

    // Transporter-specific permissions
    if (user.role === RolesEnum.transporter) {
      // Transporter profile
      // can(Action.Create, 'Transporter', { userId: user.id });
      can(Action.Read, 'Transporter', { userId: user.id });
      can(Action.Update, 'Transporter', { userId: user.id });

      can(Action.Read, 'VerificationStatus');

      // Vehicle management
      can(Action.Create, 'Vehicle');
      can(Action.Read, 'Vehicle', { owner: { userId: user.id } });
      can(Action.Update, 'Vehicle', { owner: { userId: user.id } });
      can(Action.Delete, 'Vehicle', { owner: { userId: user.id } });

      // Trip management
      can(Action.Create, 'Trip');
      can(Action.Read, 'Trip', { transporter: { userId: user.id } });
      can(Action.Update, 'Trip', { 
        transporter: { userId: user.id },
        // tripStatus: { in: [TripStatusEnum.scheduled, TripStatusEnum.delayed] }
      });
      can(Action.Delete, 'Trip', { 
        transporter: { userId: user.id },
        // tripStatus: TripStatusEnum.scheduled
      });

      // Trip waypoints (TODO)
      can(Action.Create, 'TripWaypoint', { trip: { transporter: { userId: user.id } } });
      can(Action.Read, 'TripWaypoint', { trip: { transporter: { userId: user.id } } });
      can(Action.Update, 'TripWaypoint', { trip: { transporter: { userId: user.id } } });
      can(Action.Delete, 'TripWaypoint', { trip: { transporter: { userId: user.id } } });

      // Delivery requests
      can(Action.Read, 'DeliveryRequest', { trip: { transporter: { userId: user.id } } });
      can(Action.Update, 'DeliveryRequest', { 
        trip: { transporter: { userId: user.id } },
        // status: 'pending'
      });

      // Matched requests
      can(Action.Read, 'MatchedRequest', { transporter: { userId: user.id } });
      can(Action.Update, 'MatchedRequest', 'transporterNotes',{ 
        transporter: { userId: user.id },
        matchStatus: { in: [MatchStatusEnum.confirmed, MatchStatusEnum.in_progress] }
      });

      // Tracking updates
      can(Action.Read, 'TrackingUpdate', { matchedRequest: { transporter: { userId: user.id } } });
      can(Action.Update, 'TrackingUpdate', { matchedRequest: { transporter: { userId: user.id } } });
    }

    return build();
  }
}
import { Expose, Type } from 'class-transformer';
import { AuthRoles } from '../../common/enums/auth.enum';

class Statistics {
  // For transporters
  @Expose()
  completedTrips: number;
  @Expose()
  pendingRequests: number;
  @Expose()
  notDeliveredPackages: number;
  @Expose()
  totalEscrowedAmount: bigint;

  // For senders
  @Expose()
  notPickedUpPackages: number;
  @Expose()
  inTransitPackages: number;
  @Expose()
  deliveredPackages: number;
  @Expose()
  totalUnpaidAmount: number;
}

export class DashboardResponseDto {
  @Expose()
  fullName: string;
  
  @Expose()
  totalWalletBalance: number;

  @Expose()
  notificationCount: number;
  
  @Expose()
  role?: AuthRoles;
  
  @Expose()
  profilePictureUrl?: string;

  @Expose()
  rate?: number;

  @Expose()
  experience?: string;

  @Expose()
  bio?: string;

  @Expose()
  @Type(() => Statistics)
  statistics: Statistics;
}
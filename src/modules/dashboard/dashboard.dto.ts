import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AuthRoles } from 'src/common/enums/auth.enum';

class TransporterStatistics {
  @ApiProperty()
  completedTrips: number;
  @ApiProperty()
  pendingRequests: number;
  @ApiProperty()
  notDeliveredPackages: number;
  @ApiProperty()
  totalEscrowedAmount: bigint;
}

class SenderStatistics {
  @ApiProperty()
  notPickedUpPackages: number;
  @ApiProperty()
  inTransitPackages: number;
  @ApiProperty()
  deliveredPackages: number;
  @ApiProperty()
  totalUnpaidAmount: number;
}

class Statistics {
  @Expose()
  completedTrips: number;
  @Expose()
  pendingRequests: number;
  @Expose()
  notDeliveredPackages: number;
  @Expose()
  totalEscrowedAmount: bigint;

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
  role?: AuthRoles;
  
  @Expose()
  profilePictureUrl?: string;

  @Expose()
  rate?: number;

  @Expose()
  experience?: string;

  @Expose()
  bio?: string;

  @ApiProperty({
    anyOf: [
      { $ref: '#/components/schemas/TransporterStatistics' },
      { $ref: '#/components/schemas/SenderStatistics' },
    ]
  })
  @Expose()
  @Type(() => Statistics)
  statistics: Statistics;
}
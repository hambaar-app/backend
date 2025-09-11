export interface TransporterStatistics {
  completedTrips: number;
  pendingRequests: number;
  notDeliveredPackages: number;
  totalEscrowedAmount: string;
}

export interface SenderStatistics {
  notPickedUpPackages: number;
  inTransitPackages: number;
  deliveredPackages: number;
  totalUnpaidAmount: number;
}
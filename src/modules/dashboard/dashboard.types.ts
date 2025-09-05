export interface TransporterStatistics {
  completedTrips: number;
  pendingRequests: number;
  notDeliveredPackages: number;
  totalEscrowedAmount: bigint;
}
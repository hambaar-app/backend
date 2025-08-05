// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, Between } from 'typeorm';

// // DTOs
// export class RouteOverlapDto {
//   packageId: string;
//   tripId: string;
//   overlapPercentage: number;
//   deviationDistance: number; // in meters
//   deviationTime: number; // in seconds
//   pickupDeviation: number; // distance from trip route to package origin
//   dropoffDeviation: number; // distance from trip route to package destination
//   estimatedCost: number;
//   compatibilityScore: number; // 0-100
// }

// export class FindTripsForPackageDto {
//   packageId: string;
//   maxDeviationKm?: number; // default 5km
//   maxDeviationTimeMinutes?: number; // default 30 minutes
//   minCompatibilityScore?: number; // default 70
//   maxResults?: number; // default 20
// }

// export class RouteMatchingPreferences {
//   maxPickupDeviation: number; // max km from trip route to package pickup
//   maxDropoffDeviation: number; // max km from trip route to package dropoff
//   maxTotalDeviation: number; // max additional km for the trip
//   maxTimeDeviation: number; // max additional minutes
//   preferredDeviationRadius: number; // preferred radius for matches
// }

// // Entities (simplified)
// export interface Package {
//   id: string;
//   senderId: string;
//   origin: { lat: number; lng: number; address: string };
//   destination: { lat: number; lng: number; address: string };
//   weight: number;
//   dimensions: { length: number; width: number; height: number };
//   value: number;
//   pickupTimeWindow: { start: Date; end: Date };
//   deliveryTimeWindow: { start: Date; end: Date };
//   status: 'pending' | 'matched' | 'in_transit' | 'delivered';
//   createdAt: Date;
// }

// export interface Trip {
//   id: string;
//   transporterId: string;
//   origin: { lat: number; lng: number; address: string };
//   destination: { lat: number; lng: number; address: string };
//   departureTime: Date;
//   estimatedArrivalTime: Date;
//   vehicleType: 'car' | 'motorcycle' | 'van' | 'truck';
//   availableCapacity: { weight: number; volume: number };
//   route?: {
//     polyline: string;
//     distance: number;
//     duration: number;
//     intermediateCities: string[];
//   };
//   pricing: {
//     basePrice: number;
//     pricePerKm: number;
//     pricePerKg: number;
//   };
//   status: 'planned' | 'active' | 'completed' | 'cancelled';
// }

// @Injectable()
// export class RouteMatchingService {
//   private readonly logger = new Logger(RouteMatchingService.name);
//   private readonly defaultPreferences: RouteMatchingPreferences = {
//     maxPickupDeviation: 10, // 10km
//     maxDropoffDeviation: 10, // 10km
//     maxTotalDeviation: 20, // 20km total
//     maxTimeDeviation: 45, // 45 minutes
//     preferredDeviationRadius: 5 // 5km preferred
//   };

//   constructor(
//     @InjectRepository(Package)
//     private packageRepository: Repository<Package>,
//     @InjectRepository(Trip)
//     private tripRepository: Repository<Trip>,
//     private readonly neshanMapsService: TripService // Your existing service
//   ) {}

//   /**
//    * Find compatible trips for a package
//    */
//   async findTripsForPackage(dto: FindTripsForPackageDto): Promise<RouteOverlapDto[]> {
//     try {
//       const pkg = await this.packageRepository.findOne({ 
//         where: { id: dto.packageId } 
//       });
      
//       if (!pkg) {
//         throw new Error('Package not found');
//       }

//       // Get potential trips within time and geographic bounds
//       const candidateTrips = await this.getCandidateTrips(pkg, dto);
      
//       const matches: RouteOverlapDto[] = [];

//       for (const trip of candidateTrips) {
//         try {
//           const overlap = await this.calculateRouteOverlap(pkg, trip);
          
//           if (this.isCompatibleMatch(overlap, dto)) {
//             matches.push(overlap);
//           }
//         } catch (error) {
//           this.logger.warn(`Failed to calculate overlap for trip ${trip.id}:`, error.message);
//         }
//       }

//       // Sort by compatibility score and return top results
//       return matches
//         .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
//         .slice(0, dto.maxResults || 20);

//     } catch (error) {
//       this.logger.error('Error finding trips for package:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * Calculate overlap between package route and trip route
//    */
//   async calculateRouteOverlap(pkg: Package, trip: Trip): Promise<RouteOverlapDto> {
//     try {
//       // Get routes
//       const packageRoute = await this.getPackageRoute(pkg);
//       const tripRoute = await this.getTripRoute(trip);

//       // Calculate pickup and dropoff deviations
//       const pickupDeviation = await this.calculatePointToRouteDistance(
//         pkg.origin,
//         tripRoute
//       );

//       const dropoffDeviation = await this.calculatePointToRouteDistance(
//         pkg.destination,
//         tripRoute
//       );

//       // Calculate modified trip route (with package pickup/dropoff)
//       const modifiedTripRoute = await this.calculateModifiedRoute(
//         trip,
//         pkg.origin,
//         pkg.destination
//       );

//       // Calculate deviations
//       const deviationDistance = modifiedTripRoute.distance - tripRoute.distance;
//       const deviationTime = modifiedTripRoute.duration - tripRoute.duration;

//       // Calculate overlap percentage
//       const overlapPercentage = this.calculateOverlapPercentage(
//         packageRoute,
//         tripRoute,
//         pickupDeviation,
//         dropoffDeviation
//       );

//       // Calculate compatibility score
//       const compatibilityScore = this.calculateCompatibilityScore({
//         overlapPercentage,
//         pickupDeviation,
//         dropoffDeviation,
//         deviationDistance,
//         deviationTime,
//         pkg,
//         trip
//       });

//       // Estimate cost
//       const estimatedCost = this.calculateEstimatedCost(
//         trip,
//         deviationDistance,
//         pkg.weight
//       );

//       return {
//         packageId: pkg.id,
//         tripId: trip.id,
//         overlapPercentage,
//         deviationDistance,
//         deviationTime,
//         pickupDeviation,
//         dropoffDeviation,
//         estimatedCost,
//         compatibilityScore
//       };

//     } catch (error) {
//       this.logger.error(`Error calculating route overlap:`, error.message);
//       throw error;
//     }
//   }

//   /**
//    * Get candidate trips within reasonable bounds
//    */
//   private async getCandidateTrips(
//     pkg: Package, 
//     dto: FindTripsForPackageDto
//   ): Promise<Trip[]> {
//     const maxDeviationKm = dto.maxDeviationKm || 50;
//     const maxDeviationTime = dto.maxDeviationTimeMinutes || 180;

//     // Calculate bounding box around package route
//     const bounds = this.calculateBoundingBox(
//       pkg.origin,
//       pkg.destination,
//       maxDeviationKm
//     );

//     // Time window for trip departure
//     const timeWindow = this.calculateTimeWindow(pkg, maxDeviationTime);

//     // Query database for candidate trips
//     const trips = await this.tripRepository.find({
//       where: {
//         status: 'planned',
//         departureTime: Between(timeWindow.start, timeWindow.end),
//         // Add spatial query if your database supports it
//         // ST_DWithin(origin, ST_Point(pkg.origin.lng, pkg.origin.lat), maxDeviationKm * 1000)
//       },
//       order: {
//         departureTime: 'ASC'
//       },
//       take: 100 // Limit initial candidates
//     });

//     // Filter by geographic proximity
//     return trips.filter(trip => 
//       this.isWithinBounds(trip, bounds) &&
//       this.hasAvailableCapacity(trip, pkg)
//     );
//   }

//   /**
//    * Calculate bounding box around a route with buffer
//    */
//   private calculateBoundingBox(
//     origin: { lat: number; lng: number },
//     destination: { lat: number; lng: number },
//     bufferKm: number
//   ) {
//     const bufferDegrees = bufferKm / 111; // Rough conversion

//     return {
//       north: Math.max(origin.lat, destination.lat) + bufferDegrees,
//       south: Math.min(origin.lat, destination.lat) - bufferDegrees,
//       east: Math.max(origin.lng, destination.lng) + bufferDegrees,
//       west: Math.min(origin.lng, destination.lng) - bufferDegrees
//     };
//   }

//   /**
//    * Calculate time window for trip matching
//    */
//   private calculateTimeWindow(pkg: Package, maxDeviationMinutes: number) {
//     const buffer = maxDeviationMinutes * 60 * 1000; // Convert to milliseconds
    
//     return {
//       start: new Date(pkg.pickupTimeWindow.start.getTime() - buffer),
//       end: new Date(pkg.deliveryTimeWindow.end.getTime() + buffer)
//     };
//   }

//   /**
//    * Check if trip is within geographic bounds
//    */
//   private isWithinBounds(trip: Trip, bounds: any): boolean {
//     return (
//       trip.origin.lat >= bounds.south && trip.origin.lat <= bounds.north &&
//       trip.origin.lng >= bounds.west && trip.origin.lng <= bounds.east &&
//       trip.destination.lat >= bounds.south && trip.destination.lat <= bounds.north &&
//       trip.destination.lng >= bounds.west && trip.destination.lng <= bounds.east
//     );
//   }

//   /**
//    * Check if trip has available capacity
//    */
//   private hasAvailableCapacity(trip: Trip, pkg: Package): boolean {
//     const packageVolume = pkg.dimensions.length * pkg.dimensions.width * pkg.dimensions.height / 1000000; // m³
    
//     return (
//       trip.availableCapacity.weight >= pkg.weight &&
//       trip.availableCapacity.volume >= packageVolume
//     );
//   }

//   /**
//    * Get route for package
//    */
//   private async getPackageRoute(pkg: Package) {
//     return await this.neshanMapsService.getDirections({
//       type: 'car',
//       origin: `${pkg.origin.lat},${pkg.origin.lng}`,
//       destination: `${pkg.destination.lat},${pkg.destination.lng}`
//     });
//   }

//   /**
//    * Get route for trip (use cached if available)
//    */
//   private async getTripRoute(trip: Trip) {
//     if (trip.route) {
//       return {
//         distance: trip.route.distance,
//         duration: trip.route.duration,
//         polyline: trip.route.polyline
//       };
//     }

//     return await this.neshanMapsService.getDirections({
//       type: trip.vehicleType === 'motorcycle' ? 'motorcycle' : 'car',
//       origin: `${trip.origin.lat},${trip.origin.lng}`,
//       destination: `${trip.destination.lat},${trip.destination.lng}`
//     });
//   }

//   /**
//    * Calculate distance from a point to a route
//    */
//   private async calculatePointToRouteDistance(
//     point: { lat: number; lng: number },
//     route: any
//   ): Promise<number> {
//     // Decode polyline and find minimum distance to route
//     const routePoints = this.decodePolyline(route.polyline || route.routes[0].overview_polyline.points);
    
//     let minDistance = Infinity;
    
//     for (let i = 0; i < routePoints.length - 1; i++) {
//       const segmentDistance = this.distanceToLineSegment(
//         point,
//         routePoints[i],
//         routePoints[i + 1]
//       );
//       minDistance = Math.min(minDistance, segmentDistance);
//     }
    
//     return minDistance;
//   }

//   /**
//    * Calculate modified route with package pickup/dropoff
//    */
//   private async calculateModifiedRoute(
//     trip: Trip,
//     packageOrigin: { lat: number; lng: number },
//     packageDestination: { lat: number; lng: number }
//   ) {
//     const waypoints = [
//       `${packageOrigin.lat},${packageOrigin.lng}`,
//       `${packageDestination.lat},${packageDestination.lng}`
//     ].join('|');

//     const modifiedRoute = await this.neshanMapsService.getDirections({
//       type: trip.vehicleType === 'motorcycle' ? 'motorcycle' : 'car',
//       origin: `${trip.origin.lat},${trip.origin.lng}`,
//       destination: `${trip.destination.lat},${trip.destination.lng}`,
//       waypoints
//     });

//     const totalDistance = modifiedRoute.routes[0].legs.reduce(
//       (sum, leg) => sum + leg.distance.value, 0
//     );
//     const totalDuration = modifiedRoute.routes[0].legs.reduce(
//       (sum, leg) => sum + leg.duration.value, 0
//     );

//     return {
//       distance: totalDistance,
//       duration: totalDuration
//     };
//   }

//   /**
//    * Calculate overlap percentage between two routes
//    */
//   private calculateOverlapPercentage(
//     packageRoute: any,
//     tripRoute: any,
//     pickupDeviation: number,
//     dropoffDeviation: number
//   ): number {
//     const maxAcceptableDeviation = 5000; // 5km
    
//     // Simple scoring based on deviations
//     const pickupScore = Math.max(0, 100 - (pickupDeviation / maxAcceptableDeviation) * 100);
//     const dropoffScore = Math.max(0, 100 - (dropoffDeviation / maxAcceptableDeviation) * 100);
    
//     // Weight the scores (pickup is more important than dropoff)
//     return (pickupScore * 0.6 + dropoffScore * 0.4);
//   }

//   /**
//    * Calculate compatibility score (0-100)
//    */
//   private calculateCompatibilityScore({
//     overlapPercentage,
//     pickupDeviation,
//     dropoffDeviation,
//     deviationDistance,
//     deviationTime,
//     pkg,
//     trip
//   }: {
//     overlapPercentage: number;
//     pickupDeviation: number;
//     dropoffDeviation: number;
//     deviationDistance: number;
//     deviationTime: number;
//     pkg: Package;
//     trip: Trip;
//   }): number {
//     let score = 0;

//     // Route overlap score (40% of total)
//     score += overlapPercentage * 0.4;

//     // Distance deviation score (25% of total)
//     const maxDeviationKm = 20;
//     const distanceScore = Math.max(0, 100 - (deviationDistance / 1000 / maxDeviationKm) * 100);
//     score += distanceScore * 0.25;

//     // Time deviation score (20% of total)
//     const maxDeviationMinutes = 45;
//     const timeScore = Math.max(0, 100 - (deviationTime / 60 / maxDeviationMinutes) * 100);
//     score += timeScore * 0.2;

//     // Capacity utilization score (10% of total)
//     const capacityScore = Math.min(100, (pkg.weight / trip.availableCapacity.weight) * 100);
//     score += capacityScore * 0.1;

//     // Time compatibility score (5% of total)
//     const timeCompatibility = this.calculateTimeCompatibility(pkg, trip);
//     score += timeCompatibility * 0.05;

//     return Math.round(Math.max(0, Math.min(100, score)));
//   }

//   /**
//    * Calculate time compatibility between package and trip
//    */
//   private calculateTimeCompatibility(pkg: Package, trip: Trip): number {
//     const tripStart = trip.departureTime.getTime();
//     const tripEnd = trip.estimatedArrivalTime.getTime();
//     const pickupStart = pkg.pickupTimeWindow.start.getTime();
//     const pickupEnd = pkg.pickupTimeWindow.end.getTime();
//     const deliveryStart = pkg.deliveryTimeWindow.start.getTime();
//     const deliveryEnd = pkg.deliveryTimeWindow.end.getTime();

//     // Check if trip time overlaps with package time windows
//     const pickupOverlap = Math.max(0, Math.min(tripEnd, pickupEnd) - Math.max(tripStart, pickupStart));
//     const deliveryOverlap = Math.max(0, Math.min(tripEnd, deliveryEnd) - Math.max(tripStart, deliveryStart));
    
//     const pickupWindow = pickupEnd - pickupStart;
//     const deliveryWindow = deliveryEnd - deliveryStart;
    
//     const pickupCompatibility = pickupWindow > 0 ? (pickupOverlap / pickupWindow) * 100 : 0;
//     const deliveryCompatibility = deliveryWindow > 0 ? (deliveryOverlap / deliveryWindow) * 100 : 0;
    
//     return (pickupCompatibility + deliveryCompatibility) / 2;
//   }

//   /**
//    * Check if match meets minimum requirements
//    */
//   private isCompatibleMatch(overlap: RouteOverlapDto, dto: FindTripsForPackageDto): boolean {
//     const maxDeviationKm = dto.maxDeviationKm || 50;
//     const maxDeviationTime = dto.maxDeviationTimeMinutes || 180;
//     const minCompatibilityScore = dto.minCompatibilityScore || 30;

//     return (
//       overlap.deviationDistance / 1000 <= maxDeviationKm &&
//       overlap.deviationTime / 60 <= maxDeviationTime &&
//       overlap.compatibilityScore >= minCompatibilityScore &&
//       overlap.pickupDeviation <= 15000 && // 15km max pickup deviation
//       overlap.dropoffDeviation <= 15000   // 15km max dropoff deviation
//     );
//   }

//   /**
//    * Calculate estimated cost for the package
//    */
//   private calculateEstimatedCost(trip: Trip, deviationDistance: number, weight: number): number {
//     const baseCost = trip.pricing.basePrice;
//     const distanceCost = (deviationDistance / 1000) * trip.pricing.pricePerKm;
//     const weightCost = weight * trip.pricing.pricePerKg;
    
//     return Math.round(baseCost + distanceCost + weightCost);
//   }

//   /**
//    * Utility: Distance from point to line segment
//    */
//   private distanceToLineSegment(
//     point: { lat: number; lng: number },
//     lineStart: { lat: number; lng: number },
//     lineEnd: { lat: number; lng: number }
//   ): number {
//     const A = point.lat - lineStart.lat;
//     const B = point.lng - lineStart.lng;
//     const C = lineEnd.lat - lineStart.lat;
//     const D = lineEnd.lng - lineStart.lng;

//     const dot = A * C + B * D;
//     const lenSq = C * C + D * D;
    
//     if (lenSq === 0) {
//       return this.haversineDistance(point, lineStart);
//     }

//     let param = dot / lenSq;
//     param = Math.max(0, Math.min(1, param));

//     const xx = lineStart.lat + param * C;
//     const yy = lineStart.lng + param * D;

//     return this.haversineDistance(point, { lat: xx, lng: yy });
//   }

//   /**
//    * Utility: Haversine distance calculation
//    */
//   private haversineDistance(
//     point1: { lat: number; lng: number },
//     point2: { lat: number; lng: number }
//   ): number {
//     const R = 6371e3; // Earth's radius in meters
//     const φ1 = (point1.lat * Math.PI) / 180;
//     const φ2 = (point2.lat * Math.PI) / 180;
//     const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
//     const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

//     const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//               Math.cos(φ1) * Math.cos(φ2) *
//               Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//     return R * c;
//   }

//   /**
//    * Utility: Decode polyline
//    */
//   private decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
//     const points: Array<{ lat: number; lng: number }> = [];
//     let index = 0;
//     let lat = 0;
//     let lng = 0;

//     while (index < encoded.length) {
//       let shift = 0;
//       let result = 0;
//       let byte: number;

//       do {
//         byte = encoded.charCodeAt(index++) - 63;
//         result |= (byte & 0x1f) << shift;
//         shift += 5;
//       } while (byte >= 0x20);

//       const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
//       lat += deltaLat;

//       shift = 0;
//       result = 0;

//       do {
//         byte = encoded.charCodeAt(index++) - 63;
//         result |= (byte & 0x1f) << shift;
//         shift += 5;
//       } while (byte >= 0x20);

//       const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
//       lng += deltaLng;

//       points.push({
//         lat: lat / 1e5,
//         lng: lng / 1e5
//       });
//     }

//     return points;
//   }
// }

// // Controller usage example
// @Injectable()
// export class PackageController {
//   constructor(
//     private readonly routeMatchingService: RouteMatchingService
//   ) {}

//   /**
//    * Get compatible trips for a package
//    */
//   async getCompatibleTrips(packageId: string, query: any) {
//     const dto: FindTripsForPackageDto = {
//       packageId,
//       maxDeviationKm: query.maxDeviationKm || 20,
//       maxDeviationTimeMinutes: query.maxDeviationTimeMinutes || 60,
//       minCompatibilityScore: query.minCompatibilityScore || 50,
//       maxResults: query.maxResults || 10
//     };

//     return await this.routeMatchingService.findTripsForPackage(dto);
//   }
// }
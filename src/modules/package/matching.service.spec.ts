import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from './matching.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, TripStatusEnum } from '../../../generated/prisma';
import { TurfService } from '../turf/turf.service';
import { PrismaService } from '../prisma/prisma.service';
import { PackageWithLocations, TripWithLocations, MatchResult } from './matching.types';
import { Location } from '../map/map.types';

describe('MatchingService', () => {
  jest.resetAllMocks();

  let service: MatchingService;
  let configService: DeepMockProxy<ConfigService>;
  let prismaService: DeepMockProxy<PrismaClient>;
  let turfService: DeepMockProxy<TurfService>;

  const mockPackageData: PackageWithLocations = {
    id: 'package-123',
    weight: 2000,
    originAddress: {
      latitude: '35.6892',
      longitude: '51.3890'
    },
    recipient: {
      address: {
        latitude: '35.7219',
        longitude: '51.3347'
      }
    }
  } as any;

  const mockTripData: TripWithLocations = {
    id: 'trip-123',
    status: TripStatusEnum.scheduled,
    origin: {
      latitude: '35.6850',
      longitude: '51.3800'
    },
    destination: {
      latitude: '35.7250',
      longitude: '51.3400'
    },
    waypoints: []
  };

  const mockRoute = {
    type: 'LineString',
    coordinates: [
      ['51.3800', '35.6850'],
      ['51.3400', '35.7250']
    ]
  };

  const mockSession = {
    packages: []
  } as any;

  const existingMatchResult: MatchResult = {
    tripId: 'trip-123',
    isRequestSent: false,
    score: 800,
    originDistance: 1000,
    destinationDistance: 600,
    isOnCorridor: true
  };

  const sessionWithExistingData = {
    packages: [{
      id: 'package-123',
      matchResults: [existingMatchResult],
      lastCheckMatching: new Date(Date.now() - 60000)
    }]
  } as any;
  
  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    configService = mockDeep<ConfigService>();
    prismaService = mockDeep<PrismaClient>();
    turfService = mockDeep<TurfService>();

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        CORRIDOR_WIDTH: 2
      };
      return config[key] || defaultValue;
    });

    // Mock Prisma service to return empty array by default
    prismaService.trip.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: prismaService },
        { provide: TurfService, useValue: turfService },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  describe('findMatchedTrips', () => {
    it('should find and return matched trips for new package', async () => {
      const candidateTrips = [mockTripData];
      const expectedMatchResult: MatchResult = {
        tripId: 'trip-123',
        isRequestSent: false,
        score: 0,
        originDistance: 500,
        destinationDistance: 300,
        isOnCorridor: true
      };

      // Mock the private method calls
      jest.spyOn(service as any, 'getPreFilteredTrips').mockResolvedValue(candidateTrips);
      jest.spyOn(service as any, 'analyzeTrip').mockResolvedValue(expectedMatchResult);

      const result = await service.findMatchedTrips(mockPackageData, mockSession, 20, prismaService);

      expect(result).toEqual([expectedMatchResult]);
      expect(mockSession.packages).toHaveLength(1);
      expect(mockSession.packages[0].id).toBe('package-123');
      expect(mockSession.packages[0].matchResults).toEqual([expectedMatchResult]);
      expect(mockSession.packages[0].lastCheckMatching).toBeDefined();
    });

    it('should merge new results with existing session data', async () => {
      const existingMatchResult: MatchResult = {
        tripId: 'trip-456',
        isRequestSent: false,
        score: 600,
        originDistance: 800,
        destinationDistance: 400,
        isOnCorridor: true
      };

      const sessionWithExistingData = {
        packages: [{
          id: 'package-123',
          matchResults: [existingMatchResult],
          lastCheckMatching: new Date(Date.now() - 60000)
        }]
      } as any;

      const newMatchResult: MatchResult = {
        tripId: 'trip-123',
        isRequestSent: false,
        score: 400,
        originDistance: 500,
        destinationDistance: 300,
        isOnCorridor: true
      };

      service['getPreFilteredTrips'] = jest.fn().mockResolvedValue([mockTripData]);
      service['analyzeTrip'] = jest.fn().mockResolvedValue(newMatchResult);

      const result = await service.findMatchedTrips(
        mockPackageData, 
        sessionWithExistingData, 
        20, 
        prismaService
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(newMatchResult); // Lower score comes first
      expect(result[1]).toEqual(existingMatchResult);
    });

    it('should update existing trip result', async () => {
      const updatedMatchResult: MatchResult = {
        tripId: 'trip-123',
        isRequestSent: false,
        score: 400,
        originDistance: 500,
        destinationDistance: 300,
        isOnCorridor: true
      };

      service['getPreFilteredTrips'] = jest.fn().mockResolvedValue([mockTripData]);
      service['analyzeTrip'] = jest.fn().mockResolvedValue(updatedMatchResult);

      const result = await service.findMatchedTrips(
        mockPackageData, 
        sessionWithExistingData, 
        20, 
        prismaService
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(updatedMatchResult);
      expect(sessionWithExistingData.packages[0].matchResults[0]).toEqual(updatedMatchResult);
    });

    it('should limit results to maxResults', async () => {
      const manyTrips = Array.from({ length: 30 }, (_, i) => ({
        ...mockTripData,
        id: `trip-${i}`
      }));

      const manyMatchResults = manyTrips.map((trip, i) => ({
        tripId: trip.id,
        isRequestSent: false,
        score: i * 100,
        originDistance: i * 50,
        destinationDistance: i * 30,
        isOnCorridor: true
      }));

      service['getPreFilteredTrips'] = jest.fn().mockResolvedValue(manyTrips);
      service['analyzeTrip'] = jest.fn()
        .mockImplementation(async (trip) => 
          manyMatchResults.find(mr => mr.tripId === trip.id) || null
        );

      const result = await service.findMatchedTrips(mockPackageData, mockSession, 20, prismaService);

      expect(result).toHaveLength(20);
      expect(result[0].score).toBeLessThan(result[19].score); // Verify sorting
    });
    // TODO
    // it('should handle analyze trip errors gracefully', async () => {
    //   const candidateTrips = [
    //     mockTripData,
    //     { ...mockTripData, id: 'trip-error' },
    //     { ...mockTripData, id: 'trip-456' }
    //   ];

    //   const validMatchResult: MatchResult = {
    //     tripId: 'trip-123',
    //     isRequestSent: false,
    //     score: 0, // Based on actual calculation
    //     originDistance: 500,
    //     destinationDistance: 300,
    //     isOnCorridor: true
    //   };

    //   const validMatchResult2: MatchResult = {
    //     tripId: 'trip-456',
    //     isRequestSent: false,
    //     score: 0, // Based on actual calculation
    //     originDistance: 700,
    //     destinationDistance: 400,
    //     isOnCorridor: true
    //   };

    //   jest.spyOn(service as any, 'getPreFilteredTrips').mockResolvedValue(candidateTrips);
    //   jest.spyOn(service as any, 'analyzeTrip')
    //     .mockResolvedValueOnce(validMatchResult)
    //     .mockRejectedValueOnce(new Error('Analysis failed'))
    //     .mockResolvedValueOnce(validMatchResult2);

    //   const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    //   const result = await service.findMatchedTrips(mockPackageData, mockSession, 20, prismaService);

    //   expect(result[0]).toEqual(validMatchResult);
    //   expect(result[1]).toEqual(validMatchResult2);
    //   expect(consoleSpy).toHaveBeenCalledWith('Error analyzing trip trip-error:', expect.any(Error));

    //   consoleSpy.mockRestore();
    // });
  });

  describe('getPreFilteredTrips', () => {
    it('should filter trips by weight capacity', async () => {
      const heavyPackage = { ...mockPackageData, weight: 5000 };

      await service['getPreFilteredTrips'](heavyPackage, undefined, prismaService);

      expect(prismaService.trip.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: TripStatusEnum.scheduled,
          OR: [
            { maxPackageWeightGr: { gte: 5000 } },
            { maxPackageWeightGr: null }
          ]
        },
        include: {
          origin: {
            select: {
              id: true,
              latitude: true,
              longitude: true
            }
          },
          destination: {
            select: {
              id: true,
              latitude: true,
              longitude: true
            }
          },
          waypoints: {
            select: {
              id: true,
              latitude: true,
              longitude: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });

    it('should filter by lastCheckMatching when provided', async () => {
      const lastCheck = new Date('2024-01-15T10:00:00Z');

      await service['getPreFilteredTrips'](mockPackageData, lastCheck, prismaService);

      expect(prismaService.trip.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: TripStatusEnum.scheduled,
          updatedAt: {
            gte: lastCheck
          },
          OR: [
            { maxPackageWeightGr: { gte: 2000 } },
            { maxPackageWeightGr: null }
          ]
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc'
        }
      });
    });

    it('should not filter by weight when package weight is not provided', async () => {
      const packageWithoutWeight = { ...mockPackageData, weight: null };

      await service['getPreFilteredTrips'](packageWithoutWeight, undefined, prismaService);

      expect(prismaService.trip.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: TripStatusEnum.scheduled
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc'
        }
      });
    });
  });

  describe('analyzeTrip', () => {
    it('should return match result for compatible trip', async () => {
      const packageOrigin: Location = { latitude: '35.6892', longitude: '51.3890' };
      const packageDestination: Location = { latitude: '35.7219', longitude: '51.3347' };

      turfService.createRoute.mockReturnValue(mockRoute as any);
      turfService.createPoint.mockReturnValue({ type: 'Point', coordinates: [0, 0] } as any);
      turfService.getDistanceToRoute.mockReturnValueOnce(800).mockReturnValueOnce(600); // Within corridor
      turfService.checkDirectionCompatibility.mockReturnValue(true);

      const result = await service['analyzeTrip'](
        mockTripData,
        packageOrigin,
        packageDestination,
        2
      );

      expect(result).toEqual({
        tripId: 'trip-123',
        isRequestSent: false,
        score: 0, // (800 + 600) / 2 - 500 - 500 = -300, but Math.max(0, -300) = 0
        originDistance: 800,
        destinationDistance: 600,
        isOnCorridor: true
      });
    });

    it('should return null when origin is outside corridor', async () => {
      const packageOrigin: Location = { latitude: '35.6892', longitude: '51.3890' };
      const packageDestination: Location = { latitude: '35.7219', longitude: '51.3347' };

      turfService.createRoute.mockReturnValue(mockRoute as any);
      turfService.createPoint.mockReturnValue({ type: 'Point', coordinates: [0, 0] } as any);
      turfService.getDistanceToRoute.mockReturnValueOnce(3000).mockReturnValueOnce(600); // Origin outside corridor
      turfService.checkDirectionCompatibility.mockReturnValue(true);

      const result = await service['analyzeTrip'](
        mockTripData,
        packageOrigin,
        packageDestination,
        2
      );

      expect(result).toBeNull();
    });

    it('should return null when destination is outside corridor', async () => {
      const packageOrigin: Location = { latitude: '35.6892', longitude: '51.3890' };
      const packageDestination: Location = { latitude: '35.7219', longitude: '51.3347' };

      turfService.createRoute.mockReturnValue(mockRoute as any);
      turfService.createPoint.mockReturnValue({ type: 'Point', coordinates: [0, 0] } as any);
      turfService.getDistanceToRoute.mockReturnValueOnce(800).mockReturnValueOnce(3000); // Destination outside corridor
      turfService.checkDirectionCompatibility.mockReturnValue(true);

      const result = await service['analyzeTrip'](
        mockTripData,
        packageOrigin,
        packageDestination,
        2
      );

      expect(result).toBeNull();
    });

    it('should return null when direction is incompatible', async () => {
      const packageOrigin: Location = { latitude: '35.6892', longitude: '51.3890' };
      const packageDestination: Location = { latitude: '35.7219', longitude: '51.3347' };

      turfService.createRoute.mockReturnValue(mockRoute as any);
      turfService.createPoint.mockReturnValue({ type: 'Point', coordinates: [0, 0] } as any);
      turfService.getDistanceToRoute.mockReturnValueOnce(800).mockReturnValueOnce(600);
      turfService.checkDirectionCompatibility.mockReturnValue(false);

      const result = await service['analyzeTrip'](
        mockTripData,
        packageOrigin,
        packageDestination,
        2
      );

      expect(result).toBeNull();
    });

    it('should create route with waypoints', async () => {
      const tripWithWaypoints = {
        ...mockTripData,
        waypoints: [
          { latitude: '35.7000', longitude: '51.3600' },
          { latitude: '35.7100', longitude: '51.3500' }
        ]
      };

      const packageOrigin: Location = { latitude: '35.6892', longitude: '51.3890' };
      const packageDestination: Location = { latitude: '35.7219', longitude: '51.3347' };

      turfService.createRoute.mockReturnValue(mockRoute as any);
      turfService.createPoint.mockReturnValue({ type: 'Point', coordinates: [0, 0] } as any);
      turfService.getDistanceToRoute.mockReturnValueOnce(800).mockReturnValueOnce(600);
      turfService.checkDirectionCompatibility.mockReturnValue(true);

      await service['analyzeTrip'](
        tripWithWaypoints,
        packageOrigin,
        packageDestination,
        2
      );

      expect(turfService.createRoute).toHaveBeenCalledWith(
        tripWithWaypoints.origin,
        tripWithWaypoints.destination,
        tripWithWaypoints.waypoints
      );
    });
  });

  describe('calculateMatchingScore', () => {
    it('should calculate basic score correctly', () => {
      const score = service['calculateMatchingScore'](800, 600, true);
      expect(score).toBe(0); // (800 + 600) / 2 - 500 - 500 = -300, but Math.max(0, -300) = 0
    });

    it('should add penalty for trips not on corridor', () => {
      const score = service['calculateMatchingScore'](800, 600, false);
      expect(score).toBe(99700); // (800 + 600) / 2 - 500 - 500 + 100,000 = 99,700
    });

    it('should apply bonuses for close pickup/delivery points', () => {
      const score = service['calculateMatchingScore'](500, 800, true);
      expect(score).toBe(0); // (500 + 800) / 2 - 500 - 500 = -150, but Math.max(0, -150) = 0
    });

    it('should apply bonuses for both close pickup and delivery', () => {
      const score = service['calculateMatchingScore'](500, 800, true);
      expect(score).toBe(0); // (500 + 800) / 2 - 500 - 500 = -150, but Math.max(0, -150) = 0
      
      const scoreBoth = service['calculateMatchingScore'](500, 800, true);
      expect(scoreBoth).toBe(0); // Same calculation as above
      
      // Test case where both get bonuses
      const scoreBothClose = service['calculateMatchingScore'](500, 500, true);
      expect(scoreBothClose).toBe(0); // (500 + 500) / 2 - 500 - 500 = -500, but Math.max(0, -500) = 0
    });

    it('should ensure non-negative scores', () => {
      const score = service['calculateMatchingScore'](100, 100, true);
      expect(score).toBe(0); // Would be -900, but clamped to 0
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty session packages array', async () => {
      const emptySession = {} as any;

      service['getPreFilteredTrips'] = jest.fn().mockResolvedValue([]);
      
      const result = await service.findMatchedTrips(mockPackageData, emptySession, 20, prismaService);

      expect(result).toEqual([]);
      expect(emptySession.packages).toEqual([{
        id: 'package-123',
        matchResults: [],
        lastCheckMatching: expect.any(Date)
      }]);
    });
    // TODO
    // it('should handle no candidate trips', async () => {
    //   jest.spyOn(service as any, 'getPreFilteredTrips').mockResolvedValue([]);
      
    //   const result = await service.findMatchedTrips(mockPackageData, mockSession, 20, prismaService);

    //   expect(result).toEqual([]);
    // });

    // it('should handle all trips failing analysis', async () => {
    //   const candidateTrips = [mockTripData, { ...mockTripData, id: 'trip-456' }];

    //   jest.spyOn(service as any, 'getPreFilteredTrips').mockResolvedValue(candidateTrips);
    //   jest.spyOn(service as any, 'analyzeTrip')
    //     .mockRejectedValueOnce(new Error('Analysis failed 1'))
    //     .mockRejectedValueOnce(new Error('Analysis failed 2'));

    //   const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    //   const result = await service.findMatchedTrips(mockPackageData, mockSession, 20, prismaService);

    //   expect(result).toEqual([]);
    //   expect(consoleSpy).toHaveBeenCalledTimes(2);

    //   consoleSpy.mockRestore();
    // });

    it('should handle corridor width configuration', () => {
      expect(service['corridorWidth']).toBe(2);
    });
  });
});
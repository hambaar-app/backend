import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PackageStatusEnum } from '../../../../generated/prisma';
import { TurfService } from '../../turf/turf.service';
import { MatchedRouteSorter } from './matched-route-sorter';

describe('MatchedRouteSorter', () => {
  let sorter: MatchedRouteSorter;
  let turfService: DeepMockProxy<TurfService>;

  const origin = { latitude: '35.65', longitude: '51.35' };
  const destination = { latitude: '35.95', longitude: '51.65' };

  function matchedRequest(
    id: string,
    status: PackageStatusEnum,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      package: {
        id,
        status,
        originAddress: { latitude: '35.7', longitude: '51.4' },
        recipient: { address: { latitude: '35.8', longitude: '51.5' } },
        pickupAtOrigin: true,
        deliveryAtDestination: true,
        ...overrides,
      },
    };
  }

  beforeEach(() => {
    turfService = mockDeep<TurfService>();
    sorter = new MatchedRouteSorter(turfService);
  });

  describe('sort', () => {
    it('should map pickup points for active packages and reorder by route', async () => {
      const requests = [
        matchedRequest('package-1', PackageStatusEnum.matched),
        matchedRequest('package-2', PackageStatusEnum.matched),
      ];
      turfService.sortLocationsByRoute.mockReturnValue(
        new Map([
          ['package-2', { latitude: 'x', longitude: 'y' }],
          ['package-1', { latitude: 'x', longitude: 'y' }],
        ]) as never,
      );

      const result = await sorter.sort(origin, destination, requests);

      expect(turfService.sortLocationsByRoute).toHaveBeenCalledWith(
        origin,
        destination,
        new Map([
          ['package-1', { latitude: '35.7', longitude: '51.4' }],
          ['package-2', { latitude: '35.7', longitude: '51.4' }],
        ]),
      );
      expect(result.map((r) => r.package.id)).toEqual([
        'package-2',
        'package-1',
      ]);
    });

    it('should map delivery points for matched packages without pickup', async () => {
      const requests = [
        matchedRequest('package-1', PackageStatusEnum.matched, {
          pickupAtOrigin: false,
        }),
      ];
      turfService.sortLocationsByRoute.mockReturnValue(
        new Map([['package-1', { latitude: 'x', longitude: 'y' }]]) as never,
      );

      await sorter.sort(origin, destination, requests);

      expect(turfService.sortLocationsByRoute).toHaveBeenCalledWith(
        origin,
        destination,
        new Map([['package-1', { latitude: '35.8', longitude: '51.5' }]]),
      );
    });

    it('should drop delivered, returned and cancelled packages from pickup stops', async () => {
      const requests = [
        matchedRequest('package-1', PackageStatusEnum.delivered),
        matchedRequest('package-2', PackageStatusEnum.returned),
        matchedRequest('package-3', PackageStatusEnum.cancelled),
        matchedRequest('package-4', PackageStatusEnum.matched),
      ];
      turfService.sortLocationsByRoute.mockReturnValue(new Map() as never);

      const result = await sorter.sort(origin, destination, requests);

      const sentMap = turfService.sortLocationsByRoute.mock.calls[0][2] as Map<
        string,
        unknown
      >;
      expect(Array.from(sentMap.keys())).toEqual(['package-4']);
      expect(result).toEqual([]);
    });

    it('should drop packages with neither pickup nor delivery stop', async () => {
      const requests = [
        matchedRequest('package-1', PackageStatusEnum.in_transit, {
          pickupAtOrigin: false,
          deliveryAtDestination: false,
        }),
      ];
      turfService.sortLocationsByRoute.mockReturnValue(new Map() as never);

      const result = await sorter.sort(origin, destination, requests);

      const sentMap = turfService.sortLocationsByRoute.mock.calls[0][2] as Map<
        string,
        unknown
      >;
      expect(Array.from(sentMap.keys())).toEqual([]);
      expect(result).toEqual([]);
    });

    it('should skip sorted ids with no matching request', async () => {
      const requests = [matchedRequest('package-1', PackageStatusEnum.matched)];
      turfService.sortLocationsByRoute.mockReturnValue(
        new Map([
          ['package-ghost', { latitude: 'x', longitude: 'y' }],
          ['package-1', { latitude: '35.7', longitude: '51.4' }],
        ]) as never,
      );

      const result = await sorter.sort(origin, destination, requests);

      expect(result.map((r) => r.package.id)).toEqual(['package-1']);
    });
  });
});

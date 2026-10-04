import { extractSignificantPoints, haversineDistance } from './route-filters';
import { NeshanRoute } from './map.types';

describe('haversineDistance', () => {
  it('should return zero for identical points', () => {
    expect(
      haversineDistance(
        { lat: 35.6892, lng: 51.389 },
        { lat: 35.6892, lng: 51.389 },
      ),
    ).toBe(0);
  });

  it('should return ~111.19 km for one degree of latitude', () => {
    expect(
      haversineDistance({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }),
    ).toBeCloseTo(111194.93, 0);
  });

  it('should be symmetric', () => {
    const a = { lat: 35.6, lng: 51.3 };
    const b = { lat: 0, lng: 0 };
    expect(haversineDistance(a, b)).toBe(haversineDistance(b, a));
  });
});

describe('extractSignificantPoints', () => {
  function step(
    lat: number,
    lng: number,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      name: 'step',
      instruction: '',
      bearing_after: 0,
      type: 'straight',
      modifier: 'straight',
      distance: { value: 100, text: '100 m' },
      duration: { value: 60, text: '1 min' },
      polyline: '',
      start_location: [lng, lat] as [number, number],
      ...overrides,
    };
  }

  function route(legsSteps: ReturnType<typeof step>[][]): NeshanRoute {
    return {
      overview_polyline: { points: '' },
      legs: legsSteps.map((steps, i) => ({
        summary: `leg-${i}`,
        distance: { value: 0, text: '' },
        duration: { value: 0, text: '' },
        steps,
      })),
    } as unknown as NeshanRoute;
  }

  it('should always include the origin step', () => {
    const result = extractSignificantPoints(
      route([[step(0, 0), step(0.0001, 0.0001)]]),
    );

    expect(result[0]).toEqual({ lat: 0, lng: 0 });
  });

  it('should dedup near points after the first candidate (dedup)', () => {
    const result = extractSignificantPoints(
      route([
        [
          step(0, 0),
          step(0.001, 0.001, { instruction: 'وارد خیابان ولیعصر شوید' }),
          step(0.0015, 0.0015, { distance: { value: 20000, text: '' } }),
        ],
      ]),
    );

    // NOTE: `lastPoint` starts undefined, so the first matching candidate
    // always passes the distance check; dedup applies from there on: the
    // long-distance third step is only ~78 m from the second and is dropped.
    expect(result).toEqual([
      { lat: 0, lng: 0 },
      { lat: 0.001, lng: 0.001 },
    ]);
  });

  it('should include far priority-type steps', () => {
    const result = extractSignificantPoints(
      route([[step(0, 0), step(0.2, 0.2, { type: 'turn' })]]),
    );

    expect(result).toEqual([
      { lat: 0, lng: 0 },
      { lat: 0.2, lng: 0.2 },
    ]);
  });

  it('should include far long-distance steps and skip plain near steps', () => {
    const result = extractSignificantPoints(
      route([
        [
          step(0, 0),
          step(0.5, 0.5, { distance: { value: 50000, text: '' } }),
          step(0.5001, 0.5001),
        ],
      ]),
    );

    expect(result).toEqual([
      { lat: 0, lng: 0 },
      { lat: 0.5, lng: 0.5 },
    ]);
  });

  it('should accumulate across multiple legs', () => {
    const result = extractSignificantPoints(
      route([[step(0, 0)], [step(0.3, 0.3, { type: 'merge' })]]),
    );

    expect(result).toEqual([
      { lat: 0, lng: 0 },
      { lat: 0.3, lng: 0.3 },
    ]);
  });
});

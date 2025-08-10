import * as turf from '@turf/turf';

export const TURF_TOKEN = 'TURF_TOKEN';

export const TurfProvider = {
  provide: TURF_TOKEN,
  useValue: turf,
};

export type Turf = typeof import('@turf/turf');
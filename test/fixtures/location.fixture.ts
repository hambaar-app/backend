import { Location } from '../../src/modules/map/map.types';

/** Shared coordinate locations used by package/trip/matching tests (lat/lng are strings, matching `Location`). */
export const ORIGIN_LOCATION: Location = { latitude: '35.6892', longitude: '51.389' };
export const DESTINATION_LOCATION: Location = { latitude: '32.6546', longitude: '51.668' };

export const createLocation = (latitude: string, longitude: string): Location => ({
  latitude,
  longitude,
});

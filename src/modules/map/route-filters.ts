import { NeshanRoute } from './map.types';

/**
 * Pure route-shape helpers (Phase 5 Task 2).
 *
 * Extracted verbatim from `MapService` (private `extractSignificantPoints` /
 * `haversineDistance`) so the waypoint-selection rules are unit-testable
 * without HTTP, turf or Nest.
 */
export interface RoutePoint {
  lat: number;
  lng: number;
}

/** Minimum separation between significant points, in meters. */
export const MIN_DISTANCE_THRESHOLD_M = 10000;

const PRIORITY_STEP_TYPES = [
  'roundabout',
  'rotary',
  'merge',
  'turn',
  'fork',
  'on ramp',
  'off ramp',
  'roundabout turn',
  'exit roundabout',
  'exit rotary',
];

export function extractSignificantPoints(route: NeshanRoute): RoutePoint[] {
  const points: RoutePoint[] = [];

  // Include origin
  const firstStep = route.legs[0].steps[0];
  points.push({
    lat: firstStep.start_location[1],
    lng: firstStep.start_location[0],
  });

  // Select points from steps with priority point types or significant instructions (Includes 'وارد')
  let lastPoint: RoutePoint | undefined;
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      const currentPoint = {
        lat: step.start_location[1],
        lng: step.start_location[0],
      };

      const pushPointCondition =
        ((step.instruction && step.instruction.includes('وارد')) ||
          PRIORITY_STEP_TYPES.includes(step.type) ||
          step.distance.value > MIN_DISTANCE_THRESHOLD_M) &&
        (!lastPoint ||
          haversineDistance(lastPoint, currentPoint) >
            MIN_DISTANCE_THRESHOLD_M);
      if (pushPointCondition) {
        points.push(currentPoint);
        lastPoint = currentPoint;
      }
    }
  }

  return points;
}

// calculates the great-circle distance between two points on the Earth's surface,
// given their latitude and longitude coordinates.
export function haversineDistance(
  point1: RoutePoint,
  point2: RoutePoint,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (+point1.lat * Math.PI) / 180;
  const φ2 = (+point2.lat * Math.PI) / 180;
  const Δφ = ((+point2.lat - +point1.lat) * Math.PI) / 180;
  const Δλ = ((+point2.lng - +point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

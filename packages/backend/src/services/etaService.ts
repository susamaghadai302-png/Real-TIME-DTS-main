/**
 * ETA Calculation Service
 * Uses Haversine formula for great-circle distance calculation.
 * Replaceable with Mapbox Directions or Google Maps API.
 */

export interface ETAResult {
  distanceKm: number;
  minutes: number;
  arrivalTime: string;
}

/**
 * Haversine formula: calculates the great-circle distance between two points.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate bearing (heading) from point A to point B in degrees.
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  const bearing = Math.atan2(y, x);
  return ((bearing * 180) / Math.PI + 360) % 360;
}

/**
 * Calculate ETA given driver position, destination, and optional live speed.
 * @param driverLat - Driver's current latitude
 * @param driverLng - Driver's current longitude
 * @param destLat - Destination latitude
 * @param destLng - Destination longitude
 * @param speedKmh - Live speed in km/h (default: 30 for urban delivery)
 */
export function calculateETA(
  driverLat: number,
  driverLng: number,
  destLat: number,
  destLng: number,
  speedKmh: number = 30
): ETAResult {
  // Apply a road factor (actual road distance ≈ 1.3x straight line distance)
  const roadFactor = 1.3;
  const straightLine = haversineDistance(driverLat, driverLng, destLat, destLng);
  const distanceKm = Math.round((straightLine * roadFactor) * 100) / 100;

  // Ensure minimum speed
  const effectiveSpeed = Math.max(speedKmh, 5);

  // Add stop time: 2 min per km for urban traffic
  const travelMinutes = (distanceKm / effectiveSpeed) * 60;
  const trafficBuffer = distanceKm > 1 ? 3 : 1;
  const totalMinutes = Math.ceil(travelMinutes + trafficBuffer);

  const arrivalTime = new Date(Date.now() + totalMinutes * 60 * 1000);

  return {
    distanceKm,
    minutes: Math.max(1, totalMinutes),
    arrivalTime: arrivalTime.toISOString(),
  };
}

/**
 * Format ETA for display (e.g., "12:42 PM", "2 min")
 */
export function formatETA(eta: ETAResult): string {
  if (eta.minutes <= 2) return 'Arriving now';
  if (eta.minutes <= 10) return `${eta.minutes} min`;
  const t = new Date(eta.arrivalTime);
  const hours = t.getHours();
  const mins = t.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${mins} ${ampm}`;
}

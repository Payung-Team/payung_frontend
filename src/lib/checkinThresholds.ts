// Mirrors payung_backend/src/monitoring/monitoring.constants.ts defaults.
// PREVIEW ONLY — used to band the map/status UI before the caregiver submits. The
// checkInBooking/checkOutBooking mutation response (accuracyM, distanceM, reviewReasons, ...)
// is always the authoritative source of truth; never gate the check-in button on these values.

function readRadiusMeters(envValue: string | undefined, fallback: number): number {
  const parsed = Number(envValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const WARN_RADIUS_M = readRadiusMeters(import.meta.env.VITE_WARN_RADIUS_M, 200);
export const VERDICT_RADIUS_M = readRadiusMeters(import.meta.env.VITE_VERDICT_RADIUS_M, 500);
export const GPS_ACCURACY_TRUST_M = readRadiusMeters(import.meta.env.VITE_GPS_ACCURACY_TRUST_M, 200);

const EARTH_RADIUS_M = 6371000;

/** Great-circle distance in meters. Ported from MapPicker.tsx's haversineKm (×1000). */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

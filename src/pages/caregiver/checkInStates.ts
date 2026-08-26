import type { GeolocationStatus } from '../../hooks/useGeolocation';
import { GPS_ACCURACY_TRUST_M, VERDICT_RADIUS_M, WARN_RADIUS_M } from '../../lib/checkinThresholds';

/**
 * The GPS/permission half of the 9 check-in states (states 1-4, 8-9 from the spec). States 5
 * ("early") and 6 ("late") are timing-driven, independent of GPS, and are derived separately by
 * deriveTimingNotice below. State 7 ("success") is not modeled here — it's whatever the
 * checkInBooking mutation returns, rendered by the panel once the mutation resolves.
 */
export type CheckInGpsState = 'not_asked' | 'ready' | 'warn' | 'beyond' | 'denied' | 'weak_signal';

export interface DeriveCheckInGpsStateParams {
  geoStatus: GeolocationStatus;
  accuracyM: number | null;
  /** Client-side haversine preview distance, meters. Null if coords or job-site coords are missing. */
  previewDistanceM: number | null;
}

export function deriveCheckInGpsState({
  geoStatus,
  accuracyM,
  previewDistanceM,
}: DeriveCheckInGpsStateParams): CheckInGpsState {
  if (geoStatus === 'denied' || geoStatus === 'unavailable') return 'denied';
  if (geoStatus !== 'granted') return 'not_asked';

  // Accuracy gate takes priority over distance banding — an untrustworthy fix must never be
  // reported as "in range" or "out of range," since the number itself may be meaningless.
  if (accuracyM !== null && accuracyM > GPS_ACCURACY_TRUST_M) return 'weak_signal';

  if (previewDistanceM === null) return 'ready';
  if (previewDistanceM <= WARN_RADIUS_M) return 'ready';
  if (previewDistanceM <= VERDICT_RADIUS_M) return 'warn';
  return 'beyond';
}

export interface DeriveTimingNoticeParams {
  bookingDate: string; // "YYYY-MM-DD"
  startTime: string | null; // "HH:mm"
  now: Date;
}

const LATE_GRACE_MIN_APPROXIMATION = 30;

/**
 * "Late" copy is a client-side approximation only — the backend's LATE_VERDICT_MIN constant
 * isn't exposed to the frontend. The authoritative out_of_window flag always comes back in the
 * mutation's reviewReasons regardless of what this returns. "Early" is intentionally not an
 * offence per spec, so it renders no notice at all (null), not a positive "you're early" state.
 */
export function deriveTimingNotice({ bookingDate, startTime, now }: DeriveTimingNoticeParams): 'late' | null {
  if (!startTime) return null;
  const [hours, minutes] = startTime.split(':').map(Number);
  const scheduledStart = new Date(`${bookingDate}T00:00:00`);
  scheduledStart.setHours(hours, minutes, 0, 0);

  const minutesLate = (now.getTime() - scheduledStart.getTime()) / 60000;
  return minutesLate > LATE_GRACE_MIN_APPROXIMATION ? 'late' : null;
}

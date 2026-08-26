import { useCallback, useRef, useState } from 'react';

export type GeolocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export interface GeolocationCoords {
  lat: number;
  lng: number;
}

export interface UseGeolocationResult {
  status: GeolocationStatus;
  coords: GeolocationCoords | null;
  /** Raw position.coords.accuracy, in meters. Round before sending to the backend. */
  accuracyM: number | null;
  /** Fires the browser permission prompt. Must only be called from an explicit user action. */
  requestPosition: () => void;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
};

/**
 * Wraps navigator.geolocation.getCurrentPosition. Never calls it automatically — the caregiver
 * check-in screen must only prompt for location after the caregiver clicks a button, and the
 * check-in button itself must remain usable whatever this hook reports (denied/unavailable/timed
 * out all degrade to a check-in-without-coordinates flow, never a disabled button).
 */
export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const requestInFlightRef = useRef(false);

  const requestPosition = useCallback(() => {
    if (requestInFlightRef.current) return;

    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }

    requestInFlightRef.current = true;
    setStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        requestInFlightRef.current = false;
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setAccuracyM(position.coords.accuracy);
        setStatus('granted');
      },
      (error) => {
        requestInFlightRef.current = false;
        setCoords(null);
        setAccuracyM(null);
        setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      GEOLOCATION_OPTIONS,
    );
  }, []);

  return { status, coords, accuracyM, requestPosition };
}

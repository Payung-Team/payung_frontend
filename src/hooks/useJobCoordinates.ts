import { useEffect, useState } from 'react';
import { loadGoogleMaps, geocodeAddress, type LatLng } from '../lib/googleMaps';

export interface JobCoordinates {
  lat: number | null;
  lng: number | null;
  /** 'stored' = booking.locationLat/Lng from the dropped pin. 'geocoded' = derived from
   * location_address as a fallback for bookings saved before that pin was captured — an
   * approximation, not the exact spot. 'unavailable' = neither exists, or geocoding failed. */
  source: 'stored' | 'geocoded' | 'unavailable';
}

/** Prefers the booking's real stored pin; falls back to forward-geocoding the stored
 * location_address text only when no pin was ever saved. Never fabricates a location — an address
 * that fails to geocode just stays 'unavailable', same as before this fallback existed. */
export function useJobCoordinates(
  storedLat: number | null | undefined,
  storedLng: number | null | undefined,
  address: string | null | undefined,
): JobCoordinates {
  const hasStored = storedLat !== null && storedLat !== undefined && storedLng !== null && storedLng !== undefined;
  const [geocoded, setGeocoded] = useState<LatLng | null>(null);

  useEffect(() => {
    // No reset-to-null branch here: when hasStored is true the return value below ignores
    // `geocoded` entirely, and address flipping to empty for an existing booking doesn't happen
    // in practice — so there's nothing that needs synchronously clearing on entry.
    if (hasStored || !address) return undefined;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => geocodeAddress(address))
      .then((result) => {
        if (!cancelled) setGeocoded(result);
      })
      .catch(() => {
        if (!cancelled) setGeocoded(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hasStored, address]);

  if (hasStored) return { lat: storedLat as number, lng: storedLng as number, source: 'stored' };
  if (geocoded) return { lat: geocoded.lat, lng: geocoded.lng, source: 'geocoded' };
  return { lat: null, lng: null, source: 'unavailable' };
}

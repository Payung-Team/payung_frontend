const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

let _promise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (_promise) return _promise;

  _promise = new Promise((resolve, reject) => {
    const g = (window as any).google;
    if (g?.maps?.places) { resolve(); return; }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&language=th&region=TH`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      _promise = null;
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(script);
  });

  return _promise;
}

export interface GeoResult {
  address: string;
  province: string;
  district: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Forward-geocodes a free-text address into coordinates — used as a fallback for bookings that
 * never got a dropped-pin lat/lng saved (see CaregiverBookingDetailPage/CaregiverServiceProgressPage),
 * so their map can still show a job-site marker derived from the real location_address on file. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed
  const g = (window as any).google;
  const geocoder = new g.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode(
      { address, region: 'TH' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed
      (results: any[], status: string) => {
        if (status !== 'OK' || !results?.[0]) {
          resolve(null);
          return;
        }
        const location = results[0].geometry?.location;
        if (!location) {
          resolve(null);
          return;
        }
        resolve({ lat: location.lat(), lng: location.lng() });
      }
    );
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult> {
  const g = (window as any).google;
  const geocoder = new g.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode(
      { location: { lat, lng } },
      (results: any[], status: string) => {
        if (status !== 'OK' || !results?.[0]) {
          resolve({ address: '', province: '', district: '' });
          return;
        }
        const result = results[0];
        const components: any[] = result.address_components ?? [];

        let province = '';
        let district = '';

        for (const c of components) {
          const types: string[] = c.types;
          if (types.includes('administrative_area_level_1')) {
            province = (c.long_name as string).replace(/^จังหวัด/, '').trim();
          }
          if (types.includes('administrative_area_level_2')) {
            district = (c.long_name as string).replace(/^(อำเภอ|เขต)/, '').trim();
          }
        }
        // Bangkok districts sometimes appear only in sublocality_level_1
        if (!district) {
          for (const c of components) {
            const types: string[] = c.types;
            if (types.includes('sublocality_level_1')) {
              district = (c.long_name as string).replace(/^(แขวง|เขต)/, '').trim();
            }
          }
        }

        resolve({ address: result.formatted_address as string, province, district });
      }
    );
  });
}

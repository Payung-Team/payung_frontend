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

export interface PlacePrediction {
  placeId: string;
  description: string;
}

/** Address-suggestion dropdown while typing in the "บ้านเลขที่ / ซอย / ถนน" field. */
export async function getPlacePredictions(input: string): Promise<PlacePrediction[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed
  const g = (window as any).google;
  if (!input.trim() || !g?.maps?.places) return [];
  const service = new g.maps.places.AutocompleteService();
  return new Promise((resolve) => {
    service.getPlacePredictions(
      { input, componentRestrictions: { country: 'th' }, language: 'th' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed
      (results: any[], status: string) => {
        if (status !== g.maps.places.PlacesServiceStatus.OK || !results) {
          resolve([]);
          return;
        }
        resolve(results.map((r) => ({ placeId: r.place_id, description: r.description })));
      }
    );
  });
}

export interface GeoResult {
  address: string;
  province: string;
  district: string;
  subDistrict: string;
  postalCode: string;
}

// Component types that make up จังหวัด/เขต-อำเภอ/ตำบล-แขวง/ไปรษณีย์/ประเทศ — everything
// else in address_components is the street-level part (บ้านเลขที่/ซอย/ถนน/อาคาร).
const NON_STREET_TYPES = new Set([
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'sublocality_level_1',
  'sublocality_level_2',
  'sublocality_level_3',
  'locality',
  'postal_code',
  'postal_town',
  'country',
]);

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
          resolve({ address: '', province: '', district: '', subDistrict: '', postalCode: '' });
          return;
        }
        const result = results[0];
        const components: any[] = result.address_components ?? [];

        let province = '';
        let district = '';
        let subDistrict = '';
        let postalCode = '';

        for (const c of components) {
          const types: string[] = c.types;
          if (types.includes('administrative_area_level_1')) {
            province = (c.long_name as string).replace(/^จังหวัด/, '').trim();
          }
          if (types.includes('administrative_area_level_2')) {
            district = (c.long_name as string).replace(/^(อำเภอ|เขต)/, '').trim();
          }
          if (types.includes('administrative_area_level_3')) {
            subDistrict = (c.long_name as string).replace(/^(ตำบล|แขวง)/, '').trim();
          }
          if (types.includes('postal_code')) {
            postalCode = c.long_name as string;
          }
        }
        // Bangkok เก็บ เขต/แขวง ไว้ใน sublocality_level_1/2 แทน administrative_area_level_2/3
        if (!district) {
          for (const c of components) {
            const types: string[] = c.types;
            if (types.includes('sublocality_level_1')) {
              district = (c.long_name as string).replace(/^(แขวง|เขต)/, '').trim();
            }
          }
        }
        if (!subDistrict) {
          for (const c of components) {
            const types: string[] = c.types;
            if (types.includes('sublocality_level_2')) {
              subDistrict = (c.long_name as string).replace(/^(ตำบล|แขวง)/, '').trim();
            }
          }
        }

        // ส่วนที่เหลือหลังตัด จังหวัด/เขต-อำเภอ/ตำบล-แขวง/ไปรษณีย์/ประเทศ ออก คือบ้านเลขที่/ซอย/ถนน
        const streetParts = components
          .filter((c) => !c.types.some((t: string) => NON_STREET_TYPES.has(t)))
          .map((c) => c.long_name as string);
        const address = streetParts.length > 0 ? streetParts.join(' ') : (result.formatted_address as string);

        resolve({ address, province, district, subDistrict, postalCode });
      }
    );
  });
}

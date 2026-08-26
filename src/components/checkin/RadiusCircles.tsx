import { useEffect, useRef } from 'react';
import { WARN_RADIUS_M, VERDICT_RADIUS_M } from '../../lib/checkinThresholds';

export interface RadiusCirclesProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed, matches MapPicker.tsx convention
  map: any;
  center: { lat: number; lng: number } | null;
}

const WARN_RING_STYLE = {
  strokeColor: '#F59E0B',
  strokeOpacity: 0.42,
  strokeWeight: 2,
  fillColor: '#F59E0B',
  fillOpacity: 0.1,
};

// Google Maps' Circle primitive has no native dashed-stroke option (that requires a custom
// Polyline overlay), so this ring is visually solid rather than the dashed style in the Figma
// mock — distinguished from the warn ring by color/fill only. Flagged for a follow-up if the
// dashed look is required.
const REVIEW_RING_STYLE = {
  strokeColor: '#DC2626',
  strokeOpacity: 0.28,
  strokeWeight: 2,
  fillColor: '#DC2626',
  fillOpacity: 0.06,
};

/**
 * Draws the 200m warn ring and 500m review ring around a job site on an existing Google Map.
 * Renders nothing itself — purely a side-effect wrapper around google.maps.Circle, following
 * the same imperative marker-management pattern as MapPicker.tsx.
 */
export default function RadiusCircles({ map, center }: Readonly<RadiusCirclesProps>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed
  const warnCircleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed
  const reviewCircleRef = useRef<any>(null);
  const lat = center?.lat ?? null;
  const lng = center?.lng ?? null;

  useEffect(() => {
    if (!map || lat === null || lng === null) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (globalThis as any).google;
    if (!g?.maps?.Circle) return undefined;

    const circleCenter = { lat, lng };

    if (!warnCircleRef.current) {
      warnCircleRef.current = new g.maps.Circle({ ...WARN_RING_STYLE, clickable: false, map });
    }
    if (!reviewCircleRef.current) {
      reviewCircleRef.current = new g.maps.Circle({ ...REVIEW_RING_STYLE, clickable: false, map });
    }

    warnCircleRef.current.setOptions({ center: circleCenter, radius: WARN_RADIUS_M, map });
    reviewCircleRef.current.setOptions({ center: circleCenter, radius: VERDICT_RADIUS_M, map });

    return () => {
      warnCircleRef.current?.setMap(null);
      reviewCircleRef.current?.setMap(null);
      warnCircleRef.current = null;
      reviewCircleRef.current = null;
    };
  }, [map, lat, lng]);

  return null;
}

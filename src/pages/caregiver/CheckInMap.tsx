import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../lib/googleMaps';
import RadiusCircles from '../../components/checkin/RadiusCircles';
import { Icon } from '../../components/ui/Icon';

export interface CheckInMapProps {
  jobLat: number | null;
  jobLng: number | null;
  caregiverLat: number | null;
  caregiverLng: number | null;
  /** Rounded meters to show in the bottom-left chip. Null/undefined hides the chip. */
  distanceM?: number | null;
  /** True in the "weak signal" state — the distance figure would be meaningless. */
  hideDistanceChip?: boolean;
  /** Overlay badge shown top-left of the map (e.g. the Service Progress "กำลังปฏิบัติงาน" pill). */
  overlayBadge?: React.ReactNode;
  /** The 200m/500m rings are only meaningful pre-check-in; Service Progress hides them. */
  showRadiusCircles?: boolean;
}

const JOB_MARKER_ICON = { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' };
const CAREGIVER_MARKER_ICON = { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' };

export default function CheckInMap({
  jobLat,
  jobLng,
  caregiverLat,
  caregiverLng,
  distanceM,
  hideDistanceChip = false,
  overlayBadge,
  showRadiusCircles = true,
}: Readonly<CheckInMapProps>) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed, matches MapPicker.tsx convention
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed
  const jobMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed
  const caregiverMarkerRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<unknown>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => setLoaded(true)).catch(() => setLoaded(false));
  }, []);

  useEffect(() => {
    if (!loaded || !mapDivRef.current || jobLat === null || jobLng === null) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed
    const g = (globalThis as any).google;

    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(mapDivRef.current, {
        center: { lat: jobLat, lng: jobLng },
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_BOTTOM },
      });
      setMapInstance(mapRef.current);
    }

    if (!jobMarkerRef.current) {
      jobMarkerRef.current = new g.maps.Marker({
        position: { lat: jobLat, lng: jobLng },
        map: mapRef.current,
        title: 'จุดงาน',
        icon: JOB_MARKER_ICON,
      });
    } else {
      jobMarkerRef.current.setPosition({ lat: jobLat, lng: jobLng });
    }

    return undefined;
  }, [loaded, jobLat, jobLng]);

  useEffect(() => {
    if (!mapRef.current) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no google.maps type package installed
    const g = (globalThis as any).google;

    if (caregiverLat === null || caregiverLng === null) {
      caregiverMarkerRef.current?.setMap(null);
      caregiverMarkerRef.current = null;
      return undefined;
    }

    const position = { lat: caregiverLat, lng: caregiverLng };
    if (!caregiverMarkerRef.current) {
      caregiverMarkerRef.current = new g.maps.Marker({
        position,
        map: mapRef.current,
        title: 'คุณ',
        icon: CAREGIVER_MARKER_ICON,
      });
    } else {
      caregiverMarkerRef.current.setPosition(position);
    }

    if (jobLat !== null && jobLng !== null) {
      const bounds = new g.maps.LatLngBounds();
      bounds.extend({ lat: jobLat, lng: jobLng });
      bounds.extend(position);
      mapRef.current.fitBounds(bounds, 60);
    }

    return undefined;
  }, [caregiverLat, caregiverLng, jobLat, jobLng]);

  useEffect(() => {
    return () => {
      jobMarkerRef.current?.setMap?.(null);
      caregiverMarkerRef.current?.setMap?.(null);
    };
  }, []);

  if (jobLat === null || jobLng === null) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <Icon name="location_off" color="#B0B3B8" size="large" />
        <p className="text-sm text-[#575859]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          งานนี้ไม่มีพิกัดจุดงาน ระบบจะไม่ตรวจระยะ
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-105 w-full overflow-hidden rounded-2xl border border-[#E5E7EB] lg:h-85">
      <div ref={mapDivRef} className="h-full w-full" />

      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gray-50">
          <span className="material-icons animate-spin text-3xl text-[#52B69A]">refresh</span>
          <span className="text-xs font-semibold text-[#8A8C8E]">กำลังโหลดแผนที่...</span>
        </div>
      )}

      {showRadiusCircles && <RadiusCircles map={mapInstance} center={{ lat: jobLat, lng: jobLng }} />}

      {overlayBadge && <div className="absolute left-3 top-3 z-1">{overlayBadge}</div>}

      {!hideDistanceChip && distanceM !== null && distanceM !== undefined && (
        <div
          className="absolute bottom-3 left-3 z-1 rounded-[10px] bg-white/95 px-3 py-1.5 text-sm font-bold text-[#1A1A1A] shadow-sm"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {Math.round(distanceM)} ม. จากจุดงาน
        </div>
      )}
    </div>
  );
}

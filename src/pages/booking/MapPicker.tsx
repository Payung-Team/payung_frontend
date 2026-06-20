import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, reverseGeocode } from '../../lib/googleMaps';

export interface MapPickerProps {
  latA: number;
  lngA: number;
  onChangeA: (lat: number, lng: number, address?: string, province?: string, district?: string) => void;
  latB?: number;
  lngB?: number;
  onChangeB?: (lat: number, lng: number, address?: string, province?: string, district?: string) => void;
  showPinB?: boolean;
}

// Haversine kept only as fallback when Directions API fails
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function syncMarkerPosition(markerRef: { current: any }, lat: number, lng: number) {
  const pos = markerRef.current?.getPosition();
  if (pos && (Math.abs(pos.lat() - lat) > 0.00001 || Math.abs(pos.lng() - lng) > 0.00001)) {
    markerRef.current.setPosition({ lat, lng });
  }
}

const MapPicker: React.FC<MapPickerProps> = ({
  latA,
  lngA,
  onChangeA,
  latB = 13.736717,
  lngB = 100.560543,
  onChangeB,
  showPinB = false,
}) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerARef = useRef<any>(null);
  const markerBRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const activePinRef = useRef<'A' | 'B'>('A');

  const [activePin, setActivePin] = useState<'A' | 'B'>('A');
  const [loaded, setLoaded] = useState(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const [routeFallback, setRouteFallback] = useState(false);

  const onChangeARef = useRef(onChangeA);
  const onChangeBRef = useRef(onChangeB);
  useEffect(() => { onChangeARef.current = onChangeA; }, [onChangeA]);
  useEffect(() => { onChangeBRef.current = onChangeB; }, [onChangeB]);
  useEffect(() => { activePinRef.current = activePin; }, [activePin]);

  useEffect(() => {
    loadGoogleMaps().then(() => setLoaded(true)).catch(console.error);
  }, []);

  // ---------- helpers used inside the main effect ----------

  function ensureDirectionsRenderer(g: any) {
    if (directionsRendererRef.current) return;
    directionsRendererRef.current = new g.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#52B69A', strokeWeight: 4, strokeOpacity: 0.85 },
      map: mapRef.current,
    });
  }

  function fetchRoute(g: any, aLat: number, aLng: number, bLat: number, bLng: number) {
    ensureDirectionsRenderer(g);
    directionsServiceRef.current.route(
      { origin: { lat: aLat, lng: aLng }, destination: { lat: bLat, lng: bLng }, travelMode: g.maps.TravelMode.DRIVING, region: 'TH' },
      (result: any, status: string) => {
        const leg = result?.routes?.[0]?.legs?.[0];
        if (status === 'OK' && leg) {
          directionsRendererRef.current?.setDirections(result);
          setRouteDistance(leg.distance.value / 1000);
          setRouteDuration(leg.duration.text);
          setRouteFallback(false);
        } else {
          directionsRendererRef.current?.setDirections({ routes: [] });
          setRouteDistance(haversineKm(aLat, aLng, bLat, bLng));
          setRouteDuration(null);
          setRouteFallback(true);
        }
      }
    );
  }

  function clearPinB() {
    markerBRef.current?.setMap(null);
    markerBRef.current = null;
    directionsRendererRef.current?.setMap(null);
    directionsRendererRef.current = null;
    setRouteDistance(null);
    setRouteDuration(null);
    setRouteFallback(false);
  }

  function ensureMarkerB(g: any) {
    if (markerBRef.current) return;
    markerBRef.current = new g.maps.Marker({
      position: { lat: latB, lng: lngB },
      map: mapRef.current,
      draggable: true,
      title: 'จุดปลายทาง',
      icon: { url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png' },
    });
    markerBRef.current.addListener('dragend', async () => {
      const pos = markerBRef.current.getPosition();
      const { address, province, district } = await reverseGeocode(pos.lat(), pos.lng());
      onChangeBRef.current?.(pos.lat(), pos.lng(), address, province, district);
    });
  }

  // ---------- main effect ----------

  useEffect(() => {
    if (!loaded || !mapDivRef.current) return;
    const g = (globalThis as any).google;

    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(mapDivRef.current, {
        center: { lat: latA, lng: lngA },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_BOTTOM },
      });

      markerARef.current = new g.maps.Marker({
        position: { lat: latA, lng: lngA },
        map: mapRef.current,
        draggable: true,
        title: 'ที่อยู่บ้าน',
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' },
      });

      markerARef.current.addListener('dragend', async () => {
        const pos = markerARef.current.getPosition();
        const { address, province, district } = await reverseGeocode(pos.lat(), pos.lng());
        onChangeARef.current(pos.lat(), pos.lng(), address, province, district);
      });

      mapRef.current.addListener('click', async (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const { address, province, district } = await reverseGeocode(lat, lng);
        if (activePinRef.current === 'A') {
          markerARef.current.setPosition({ lat, lng });
          onChangeARef.current(lat, lng, address, province, district);
        } else if (activePinRef.current === 'B' && markerBRef.current) {
          markerBRef.current.setPosition({ lat, lng });
          onChangeBRef.current?.(lat, lng, address, province, district);
        }
      });

      directionsServiceRef.current = new g.maps.DirectionsService();
    }

    syncMarkerPosition(markerARef, latA, lngA);

    if (showPinB && onChangeB) {
      ensureMarkerB(g);
      syncMarkerPosition(markerBRef, latB, lngB);
      fetchRoute(g, latA, lngA, latB, lngB);

      const bounds = new g.maps.LatLngBounds();
      bounds.extend({ lat: latA, lng: lngA });
      bounds.extend({ lat: latB, lng: lngB });
      mapRef.current.fitBounds(bounds, 60);
    } else {
      clearPinB();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, latA, lngA, latB, lngB, showPinB]);

  useEffect(() => {
    return () => {
      markerARef.current?.setMap?.(null);
      markerBRef.current?.setMap?.(null);
      directionsRendererRef.current?.setMap?.(null);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <button
          type="button"
          onClick={() => setActivePin('A')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
            activePin === 'A'
              ? 'bg-[#52B69A] border-[#52B69A] text-white'
              : 'border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-white shrink-0" />
          ปักหมุดบ้าน (A)
        </button>

        {showPinB && (
          <button
            type="button"
            onClick={() => setActivePin('B')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              activePin === 'B'
                ? 'bg-[#E17055] border-[#E17055] text-white'
                : 'border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 border border-white shrink-0" />
            ปักหมุดปลายทาง (B)
          </button>
        )}

        <span className="text-[11px] text-[#8A8C8E]">
          คลิกแผนที่หรือลากหมุดเพื่อระบุตำแหน่ง
        </span>
      </div>

      <div className="relative w-full h-[300px] border border-[#E0E2E5] rounded-xl overflow-hidden shadow-sm">
        <div ref={mapDivRef} className="w-full h-full" />

        {!loaded && (
          <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center gap-2 z-10">
            <span className="material-icons animate-spin text-[#52B69A] text-3xl">refresh</span>
            <span className="text-xs text-[#8A8C8E] font-semibold">กำลังโหลด Google Maps...</span>
          </div>
        )}

        {showPinB && routeDistance !== null && (
          <div className="absolute top-3 left-3 bg-white px-3 py-1.5 rounded-lg border border-[#E0E2E5] shadow text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5 pointer-events-none z-[1]">
            <span className="material-icons text-[#52B69A] text-base">directions_car</span>
            <span>
              {routeDistance.toFixed(2)} กม.
              {routeDuration && <span className="font-normal text-[#575859] ml-1">· {routeDuration}</span>}
              {routeFallback && <span className="font-normal text-[#8A8C8E] ml-1">(เส้นตรง)</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPicker;

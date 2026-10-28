import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, reverseGeocode } from '../../lib/googleMaps';
import { requestPosition, type GeoFailure } from '../../lib/geolocation';

// ไม่ใช้ GEO_FAILURE_TH เพราะข้อความชุดนั้นเขียนไว้สำหรับหน้าเช็คอิน/ปิดงานของผู้ดูแล
const LOCATE_FAILURE_TH: Record<GeoFailure, string> = {
  insecure_context: 'เบราว์เซอร์ไม่อนุญาตให้ใช้ตำแหน่งบนหน้าเว็บที่ไม่ใช่ https — กรุณาปักหมุดเองบนแผนที่',
  unsupported: 'เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง — กรุณาปักหมุดเองบนแผนที่',
  denied: 'ไม่ได้อนุญาตให้เข้าถึงตำแหน่ง',
  unavailable: 'หาตำแหน่งไม่ได้ในขณะนี้ — ตรวจสอบว่าเปิด GPS/Location ของเครื่องแล้ว',
  timeout: 'ใช้เวลาหาตำแหน่งนานเกินไป — ลองกดใหม่อีกครั้ง',
};

type DeviceKind = 'in_app' | 'ios' | 'android' | 'desktop';

function detectDevice(): DeviceKind {
  const ua = navigator.userAgent;
  if (/\bLine\/|FBAN|FBAV|Instagram/i.test(ua)) return 'in_app';
  // iPadOS 13+ แจ้งตัวเป็น Macintosh — แยกด้วยจอสัมผัส
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

// เบราว์เซอร์จะไม่เด้ง popup ขอสิทธิ์ซ้ำหลังถูกปฏิเสธ (หน้าเว็บสั่งให้ขึ้นใหม่ไม่ได้)
// ทางเดียวคือบอกผู้ใช้ให้ไปเปิดเองตามอุปกรณ์ที่ใช้อยู่
const DENIED_STEPS_TH: Record<DeviceKind, string[]> = {
  in_app: [
    'คุณกำลังเปิดผ่านแอป (เช่น LINE, Facebook) ซึ่งไม่อนุญาตให้หน้าเว็บขอตำแหน่ง',
    'กดปุ่ม ⋯ หรือ ⋮ มุมขวาบน แล้วเลือก "เปิดในเบราว์เซอร์" (Safari/Chrome) แล้วลองใหม่',
  ],
  ios: [
    'ไปที่ การตั้งค่า > ความเป็นส่วนตัวและความปลอดภัย > บริการหาตำแหน่ง ตรวจว่าเปิดอยู่',
    'ในหน้าเดียวกัน เลือก "เว็บไซต์ Safari" (หรือ Chrome) > "ขณะใช้แอป"',
    'กลับมาที่ Safari แตะ "aA" ข้างช่อง URL > การตั้งค่าเว็บไซต์ > ตำแหน่ง > "ถาม" หรือ "อนุญาต"',
    'กดปุ่ม "ใช้ตำแหน่งปัจจุบัน" อีกครั้ง',
  ],
  android: [
    'แตะไอคอนด้านซ้ายของช่อง URL > สิทธิ์ (Permissions) > ตำแหน่ง > "อนุญาต"',
    'ตรวจว่าเปิดตำแหน่ง (Location) ของเครื่องจากแถบด้านบนแล้ว',
    'กดปุ่ม "ใช้ตำแหน่งปัจจุบัน" อีกครั้ง',
  ],
  desktop: [
    'คลิกไอคอนด้านซ้ายของช่อง URL > ตำแหน่ง > "อนุญาต"',
    'กดปุ่ม "ใช้ตำแหน่งปัจจุบัน" อีกครั้ง',
  ],
};

export type PinChangeHandler = (
  lat: number,
  lng: number,
  address?: string,
  province?: string,
  district?: string,
  subDistrict?: string,
  postalCode?: string,
) => void;

// จุดกึ่งกลางเริ่มต้นของ "กล้อง" แผนที่เท่านั้น (ใช้ตอนยังไม่มีทั้งหมุด A และ B เลย
// เช่น กำลังรอผล geolocation) — ไม่ใช่พิกัดที่ถือเป็นตำแหน่งจริงของหมุดใดๆ ทั้งสิ้น
const INITIAL_CAMERA_CENTER = { lat: 13.7563, lng: 100.5018 };

export interface MapPickerProps {
  // undefined = ยังไม่มีพิกัด (เช่น กำลังรอผลตำแหน่งปัจจุบัน หรือผู้ใช้ยังไม่ได้ปักหมุดเอง)
  latA?: number;
  lngA?: number;
  onChangeA: PinChangeHandler;
  latB?: number;
  lngB?: number;
  onChangeB?: PinChangeHandler;
  showPinB?: boolean;
  // ชื่อหมุดที่โชว์บนปุ่มสลับ/ป้ายชื่อหมุดบนแผนที่ — ปรับได้ เพราะ MapPicker ถูกใช้ทั้งกับ
  // "ที่อยู่บ้าน" และ "จุดนัดพบ" ซึ่งความหมายของหมุด A ไม่เหมือนกัน
  labelA?: string;
  labelB?: string;
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
  latB,
  lngB,
  onChangeB,
  showPinB = false,
  labelA = 'บ้าน',
  labelB = 'ปลายทาง',
}) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerARef = useRef<any>(null);
  const markerBRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const activePinRef = useRef<'A' | 'B'>('A');
  const showPinBRef = useRef(showPinB);

  const [activePin, setActivePin] = useState<'A' | 'B'>('A');
  const [loaded, setLoaded] = useState(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const [routeFallback, setRouteFallback] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [deniedSteps, setDeniedSteps] = useState<string[] | null>(null);

  const onChangeARef = useRef(onChangeA);
  const onChangeBRef = useRef(onChangeB);
  useEffect(() => { onChangeARef.current = onChangeA; }, [onChangeA]);
  useEffect(() => { onChangeBRef.current = onChangeB; }, [onChangeB]);
  useEffect(() => { activePinRef.current = activePin; }, [activePin]);
  useEffect(() => { showPinBRef.current = showPinB; }, [showPinB]);

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

  function clearPinA() {
    markerARef.current?.setMap(null);
    markerARef.current = null;
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

  // ทั้งสองฟังก์ชันต้องรับตำแหน่งเริ่มต้นมาจากผู้เรียกเสมอ — ไม่มีพิกัด default ในตัวฟังก์ชัน
  // เพราะเรียกได้สองทาง: (1) lat/lng ที่มีค่าอยู่แล้ว (จาก draft เดิม หรือผลตำแหน่งปัจจุบัน)
  // หรือ (2) ตำแหน่งที่ผู้ใช้เพิ่งคลิกบนแผนที่ (ยังไม่เคยมีหมุดนี้มาก่อน)
  function ensureMarkerA(g: any, initLat: number, initLng: number) {
    if (markerARef.current) return;
    markerARef.current = new g.maps.Marker({
      position: { lat: initLat, lng: initLng },
      map: mapRef.current,
      draggable: true,
      title: labelA,
      icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' },
    });
    markerARef.current.addListener('dragend', async () => {
      const pos = markerARef.current.getPosition();
      const { address, province, district, subDistrict, postalCode } = await reverseGeocode(pos.lat(), pos.lng());
      onChangeARef.current(pos.lat(), pos.lng(), address, province, district, subDistrict, postalCode);
    });
  }

  function ensureMarkerB(g: any, initLat: number, initLng: number) {
    if (markerBRef.current) return;
    markerBRef.current = new g.maps.Marker({
      position: { lat: initLat, lng: initLng },
      map: mapRef.current,
      draggable: true,
      title: labelB,
      icon: { url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png' },
    });
    markerBRef.current.addListener('dragend', async () => {
      const pos = markerBRef.current.getPosition();
      const { address, province, district, subDistrict, postalCode } = await reverseGeocode(pos.lat(), pos.lng());
      onChangeBRef.current?.(pos.lat(), pos.lng(), address, province, district, subDistrict, postalCode);
    });
  }

  // ---------- main effect ----------

  useEffect(() => {
    if (!loaded || !mapDivRef.current) return;
    const g = (globalThis as any).google;

    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(mapDivRef.current, {
        // ศูนย์กลางเริ่มต้นของกล้องเท่านั้น ใช้ตอนยังไม่มีพิกัดหมุด A เลย (เช่น กำลังรอ
        // ผล geolocation) — ไม่ได้แปลว่าหมุด A อยู่ตรงนี้ ดูตรรกะสร้างหมุดด้านล่าง
        center: latA != null && lngA != null ? { lat: latA, lng: lngA } : INITIAL_CAMERA_CENTER,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_BOTTOM },
      });

      mapRef.current.addListener('click', async (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const { address, province, district, subDistrict, postalCode } = await reverseGeocode(lat, lng);
        // คลิกครั้งแรก (ยังไม่มีหมุด) → สร้างหมุดตรงจุดที่คลิกเลย ไม่มี default ให้ "sync" ไปหา
        if (activePinRef.current === 'A') {
          if (markerARef.current) {
            markerARef.current.setPosition({ lat, lng });
          } else {
            ensureMarkerA(g, lat, lng);
          }
          onChangeARef.current(lat, lng, address, province, district, subDistrict, postalCode);
        } else if (activePinRef.current === 'B' && showPinBRef.current) {
          if (markerBRef.current) {
            markerBRef.current.setPosition({ lat, lng });
          } else {
            ensureMarkerB(g, lat, lng);
          }
          onChangeBRef.current?.(lat, lng, address, province, district, subDistrict, postalCode);
        }
      });

      directionsServiceRef.current = new g.maps.DirectionsService();
    }

    if (latA != null && lngA != null) {
      ensureMarkerA(g, latA, lngA);
      syncMarkerPosition(markerARef, latA, lngA);
      mapRef.current.panTo({ lat: latA, lng: lngA });
    } else {
      clearPinA();
    }

    if (showPinB && onChangeB && latB != null && lngB != null) {
      ensureMarkerB(g, latB, lngB);
      syncMarkerPosition(markerBRef, latB, lngB);

      if (latA != null && lngA != null) {
        fetchRoute(g, latA, lngA, latB, lngB);
        const bounds = new g.maps.LatLngBounds();
        bounds.extend({ lat: latA, lng: lngA });
        bounds.extend({ lat: latB, lng: lngB });
        mapRef.current.fitBounds(bounds, 60);
      } else {
        // ยังไม่มีหมุด A ให้คำนวณเส้นทางด้วย — แค่โฟกัสกล้องไปที่หมุด B ที่เพิ่งปักไปก่อน
        mapRef.current.panTo({ lat: latB, lng: lngB });
      }
    } else {
      clearPinB();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, latA, lngA, latB, lngB, showPinB]);

  // ปุ่ม "ตำแหน่งปัจจุบัน" — ย้ายหมุด A (บ้าน/จุดนัดพบ) มาที่ตำแหน่งของผู้ใช้เสมอ
  // เพราะหมุด B คือปลายทาง ไม่ใช่ที่ที่ผู้ใช้ยืนอยู่ตอนนี้
  // ส่งผ่าน onChangeA เหมือนการคลิกแผนที่ — ผู้เรียกจะเติมช่องข้อความให้ตามโหมดของตัวเอง
  // แล้ว main effect ด้านบนจะสร้าง/ย้ายหมุดและเลื่อนกล้องตาม latA/lngA ใหม่เอง
  async function handleLocateMe() {
    if (locating) return;
    setLocating(true);
    setLocateError(null);
    setDeniedSteps(null);
    setActivePin('A');
    const result = await requestPosition();
    if (!result.ok) {
      setLocateError(LOCATE_FAILURE_TH[result.reason]);
      if (result.reason === 'denied') setDeniedSteps(DENIED_STEPS_TH[detectDevice()]);
      setLocating(false);
      return;
    }
    const { lat, lng } = result.fix;
    // pan เองด้วย — ถ้าพิกัดเท่าเดิม latA/lngA ไม่เปลี่ยน main effect จะไม่รัน กล้องเลยไม่ขยับกลับมา
    mapRef.current?.panTo({ lat, lng });
    const { address, province, district, subDistrict, postalCode } = await reverseGeocode(lat, lng);
    onChangeARef.current(lat, lng, address, province, district, subDistrict, postalCode);
    setLocating(false);
  }

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
          ปักหมุด{labelA} (A)
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
            ปักหมุด{labelB} (B)
          </button>
        )}

        {/* ต้องรอ Maps โหลดเสร็จก่อน เพราะ handleLocateMe เรียก reverseGeocode ต่อ */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={!loaded || locating}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#52B69A] bg-[#F0FAF4] text-xs font-semibold text-[#1B5C48] hover:bg-[#E6F5ED] active:bg-[#D9F0E3] transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          <span className={`material-icons text-[#52B69A] text-base ${locating ? 'animate-spin' : ''}`}>
            {locating ? 'refresh' : 'my_location'}
          </span>
          {locating ? 'กำลังหาตำแหน่ง...' : 'ใช้ตำแหน่งปัจจุบัน'}
        </button>

        <span className="basis-full text-[11px] text-[#8A8C8E]">
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

      {locateError && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 space-y-1.5">
          <p className="text-xs font-semibold text-red-600">{locateError}</p>
          {deniedSteps && (
            <>
              <p className="text-xs text-[#575859]">
                เบราว์เซอร์จะไม่ถามซ้ำหลังถูกปฏิเสธ วิธีเปิดสิทธิ์:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-xs text-[#575859] leading-relaxed">
                {deniedSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="text-xs text-[#8A8C8E]">หรือแตะบนแผนที่เพื่อปักหมุดเองได้เลย</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MapPicker;

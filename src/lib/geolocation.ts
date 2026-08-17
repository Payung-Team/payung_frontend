/**
 * Browser geolocation for check-in / check-out (PYG-352 / PYG-358)
 *
 * ⚠ อ่านก่อนแก้ไฟล์นี้ — เราเป็น web app ไม่ใช่ mobile app แล้ว
 *   เบราว์เซอร์บนเดสก์ท็อปไม่มีชิป GNSS มันเดาตำแหน่งจาก Wi-Fi หรือ IP
 *   ค่าคลาดเคลื่อนหลักร้อยเมตรถึงหลายกิโลเมตรเป็นเรื่องปกติมาก
 *
 *   เพราะแบบนั้นเราจึงต้องส่ง `accuracy` (รัศมีความเชื่อมั่น 95% หน่วยเมตร)
 *   ไปให้ backend ทุกครั้ง — backend จะไม่ติดธง out_of_radius ถ้าค่านี้สูงเกิน
 *   GPS_ACCURACY_TRUST_M ไม่ว่าระยะทางที่คำนวณได้จะเป็นเท่าไหร่
 *   (ห้ามลงโทษผู้ดูแลเพราะข้อจำกัดของอุปกรณ์ฝั่งเราเอง)
 *
 * กฎเหล็ก: ฟังก์ชันในไฟล์นี้ "ไม่เคย throw" — ตำแหน่งเป็นของเสริมเสมอ
 * ผู้ดูแลต้องเช็คอิน/เช็คเอาท์ได้แม้จะปฏิเสธสิทธิ์ตำแหน่ง
 */

/** ขอตำแหน่งแบบดีที่สุดที่เบราว์เซอร์ทำได้ แต่ไม่รอเกิน 10 วินาที */
export const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true, // ไม่ได้เสกชิป GPS ขึ้นมา แค่บอกเบราว์เซอร์ให้ใช้วิธีที่ดีที่สุด
  timeout: 10_000,
  maximumAge: 0, // ห้ามใช้ค่าเก่าใน cache — หลักฐานต้องเป็นตำแหน่ง ณ ตอนกดจริง
};

export interface GeoFix {
  lat: number;
  lng: number;
  /** position.coords.accuracy (เมตร) — ปัดเป็นจำนวนเต็มเพราะ schema เป็น Int */
  accuracyM: number;
}

export type GeoFailure =
  /** หน้าเว็บไม่ได้รันบน https (localhost ยกเว้นให้) — API ถูกปิดทั้งตัว */
  | 'insecure_context'
  /** เบราว์เซอร์ไม่มี navigator.geolocation เลย */
  | 'unsupported'
  /** ผู้ใช้กดปฏิเสธสิทธิ์ */
  | 'denied'
  /** ระบบหาตำแหน่งไม่เจอ (ปิด location service ทั้งเครื่อง ฯลฯ) */
  | 'unavailable'
  /** เกิน 10 วินาทีแล้วยังไม่ได้ค่า */
  | 'timeout';

export type GeoResult =
  | { ok: true; fix: GeoFix }
  | { ok: false; reason: GeoFailure };

/** ข้อความไทยสำหรับแต่ละสาเหตุ — ทุกอันต้องจบด้วย "ยังปิดงานได้" ไม่ใช่ dead end */
export const GEO_FAILURE_TH: Record<GeoFailure, string> = {
  insecure_context:
    'เบราว์เซอร์ไม่อนุญาตให้ใช้ตำแหน่งบนหน้าเว็บที่ไม่ใช่ https — ปิดงานได้ตามปกติ',
  unsupported: 'เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง — ปิดงานได้ตามปกติ',
  denied: 'ไม่ได้อนุญาตให้เข้าถึงตำแหน่ง — ปิดงานได้ตามปกติ',
  unavailable: 'หาตำแหน่งไม่ได้ในขณะนี้ — ปิดงานได้ตามปกติ',
  timeout: 'ใช้เวลาหาตำแหน่งนานเกินไป — ปิดงานได้ตามปกติ',
};

/**
 * ขอตำแหน่งปัจจุบัน — resolve เสมอ ไม่มีทาง reject
 *
 * ตั้งใจไม่ throw เพื่อให้ที่เรียกใช้ไม่ต้อง try/catch แล้วเผลอบล็อกปุ่มปิดงาน
 */
export function requestPosition(): Promise<GeoResult> {
  // secure context ครอบคลุม localhost ให้อยู่แล้ว จึง dev บนเครื่องได้ปกติ
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return Promise.resolve({ ok: false, reason: 'insecure_context' });
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }

  return new Promise<GeoResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          ok: true,
          fix: {
            lat: latitude,
            lng: longitude,
            // accuracy เป็น Int ฝั่ง GraphQL และห้ามติดลบ (class-validator @Min(0))
            accuracyM: Math.max(0, Math.round(accuracy)),
          },
        });
      },
      (error) => {
        resolve({ ok: false, reason: mapGeoError(error) });
      },
      GEO_OPTIONS,
    );
  });
}

function mapGeoError(error: GeolocationPositionError): GeoFailure {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'denied';
    case error.TIMEOUT:
      return 'timeout';
    default:
      return 'unavailable';
  }
}

/**
 * ระยะทางระหว่างสองพิกัด (เมตร) — สูตร haversine เดียวกับฝั่ง backend
 *
 * ★ ค่าที่ได้จากที่นี่ใช้ "โชว์ให้ผู้ใช้เห็นก่อนกดปุ่ม" เท่านั้น
 *   ตัวเลขที่มีผลจริงคือค่าที่ backend คำนวณเองตอนบันทึกเหตุการณ์
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const EARTH_RADIUS_M = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Proof-of-work — types, thresholds และตัวจัดรูปแบบสำหรับฝั่ง UI (PYG-358)
 *
 * ★ ตัวเลข threshold ในไฟล์นี้เป็น "สำเนาไว้แสดงผล" เท่านั้น
 *   ค่าจริงอยู่ใน ENV ของ backend (payung-api/src/monitoring/monitoring.constants.ts)
 *   และ backend เป็นคนตัดสินว่าจะติดธงหรือไม่เสมอ
 *   FE ใช้ค่าพวกนี้แค่เพื่อ "เตือนล่วงหน้า" ก่อนผู้ใช้กดปุ่ม
 *   ถ้าสองฝั่งไม่ตรงกัน ผลที่ตามมาคือคำเตือนคลาดเคลื่อน ไม่ใช่เงินไหลผิด
 */

/** ≤ 200 ม. = ปกติ */
export const WARN_RADIUS_M = 200;

/** > 500 ม. = backend ติดธง out_of_radius → เตือนก่อนกด */
export const VERDICT_RADIUS_M = 500;

/** accuracy เกินค่านี้ = สัญญาณเชื่อไม่ได้ → backend ไม่ติดธงระยะทางใด ๆ */
export const GPS_ACCURACY_TRUST_M = 200;

/** ทำงานจริงน้อยกว่า 80% ของเวลาที่จอง → backend ติดธง short_duration */
export const MIN_DURATION_RATIO = 0.8;

/** ขนาดไฟล์สูงสุดที่ bucket รับ */
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

/** ความยาวบันทึกปิดงานสูงสุด — ตรงกับ @MaxLength(500) ฝั่ง backend */
export const NOTE_MAX_LENGTH = 500;

// ──────────────────────────────────────────────────────────────────────────
// Types — ต้องตรงกับ payung-api/src/schema.gql
// ──────────────────────────────────────────────────────────────────────────

export interface JobEvent {
  id: string;
  bookingId: string;
  eventType: 'check_in' | 'check_out';
  source: 'caregiver' | 'system';
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
  accuracyM: number | null;
  /** เวลาที่เซิร์ฟเวอร์บันทึก — เวลาที่ถือเป็นทางการ (ISO string) */
  serverTs: string;
  deviceTs: string | null;
  note: string | null;
  /** signed URL อายุ 1 ชม. (backend เก็บเป็น path แต่คืนเป็น URL) */
  photoUrl: string | null;
  gpsAccuracyLow: boolean;
  jobCoordsMissing: boolean;
  withinWarnRadius: boolean | null;
  reviewReasons: string[];
  alreadyCheckedIn: boolean;
}

export interface ProofOfWorkSummary {
  checkIn: JobEvent | null;
  checkOut: JobEvent | null;
  /** เวลาทำงานจริง (นาที) จาก server_ts ทั้งสองฝั่ง — null เมื่อยังไม่ปิดงาน */
  actualMinutes: number | null;
  bookedMinutes: number;
  distanceInM: number | null;
  distanceOutM: number | null;
  /** ★ สำหรับแสดงผลเท่านั้น ห้ามใช้ตัดสิน */
  durationOk: boolean;
  noCheckout: boolean;
  jobCoordsMissing: boolean;
  /** ★ ตัวตัดสินจริง */
  reviewReasons: string[];
  disputed: boolean;
  verdict: 'valid' | 'needs_review' | 'incomplete';
}

// ──────────────────────────────────────────────────────────────────────────
// คำแปลไทย
// ──────────────────────────────────────────────────────────────────────────

/**
 * ธงทุกค่าที่ backend เขียนได้ ต้องมีคำแปลครบ
 * (ดู REVIEW_REASON ใน monitoring.constants.ts — เพิ่มค่าใหม่ที่นั่นต้องมาเพิ่มที่นี่ด้วย)
 */
export const REVIEW_REASON_TH: Record<string, string> = {
  short_duration: 'เวลาทำงานน้อยกว่าที่จอง',
  out_of_radius: 'ตำแหน่งอยู่นอกพื้นที่',
  out_of_window: 'เช็คอินช้ากว่าเวลานัด',
  clock_anomaly: 'เวลาในเครื่องไม่ตรงกับระบบ',
  no_checkout: 'ไม่ได้กดปิดงาน ระบบปิดให้อัตโนมัติ',
};

/** แปลธงเป็นไทย — ธงที่ยังไม่มีคำแปลจะคืนค่าดิบ ดีกว่าหายไปเงียบ ๆ */
export function reviewReasonTh(reason: string): string {
  return REVIEW_REASON_TH[reason] ?? reason;
}

// ──────────────────────────────────────────────────────────────────────────
// Formatters
// ──────────────────────────────────────────────────────────────────────────

/** "02:15 น." — เวลาไทยเสมอ ไม่ขึ้นกับ timezone ของเครื่องผู้ใช้ */
export function formatThaiTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  const time = new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).format(date);

  return `${time} น.`;
}

/** "2 ชม. 15 นาที" / "45 นาที" / "3 ชม." */
export function formatDurationTh(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) {
    return '—';
  }

  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;

  if (hours === 0) return `${mins} นาที`;
  if (mins === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${mins} นาที`;
}

/** "150 ม." / "1.2 กม." */
export function formatDistanceTh(metres: number | null | undefined): string {
  if (metres === null || metres === undefined || !Number.isFinite(metres)) {
    return '—';
  }
  if (metres < 1000) return `${Math.round(metres)} ม.`;
  return `${(metres / 1000).toFixed(1)} กม.`;
}

/**
 * เวลาทำงานจนถึงตอนนี้ (นาที) — นับจาก server_ts ของการเช็คอิน
 *
 * ★ ห้ามใช้เวลาเช็คอินจากนาฬิกาเครื่องเด็ดขาด (การ์ด STEP 1.3)
 *   ค่าที่ได้เป็น "ประมาณการก่อนกดปิดงาน" เท่านั้น
 *   ตัวเลขที่เป็นข้อเท็จจริงคือ proofOfWork.actualMinutes หลังปิดงานแล้ว
 */
export function elapsedMinutesSince(checkInServerTs: string, now: Date): number {
  const start = new Date(checkInServerTs).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.round((now.getTime() - start) / 60_000));
}

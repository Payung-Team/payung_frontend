import { extractGraphQLErrorExtensions } from './apolloErrors';

/**
 * รายชื่อผู้ดูแลตามเงื่อนไขของ booking (S18 · PYG-648) — จุดเชื่อมกับ BE
 *
 * ★ BE ของ S18 (PYG-646 contract · PYG-647 ตัวกรอง) ยังไม่อยู่ใน payung_backend (20 ต.ค. 2026):
 *   ไม่มี eligibleCaregivers, ไม่มี CaregiverSummary.careLevel, ไม่มี error code ของ S18
 *   หน้ารายชื่อจึงยังเรียก searchCaregivers เดิม ซึ่ง "ไม่ได้" กรองตามระดับ/ทักษะ
 *
 * วันที่ BE ขึ้น:
 *   1. graphql/queries.ts → SUMMARY_CARE_LEVEL_FIELD = "careLevel" (ป้ายระดับขึ้นเอง)
 *   2. SearchPage เรียก query ที่กรองตาม booking แทน searchCaregivers แล้วตั้ง CAREGIVER_MATCH_LIVE = true
 *      → เปิดหัวรายชื่อ "คัดตามระดับ…" และสถานะ AC7 · ก่อนหน้านั้นห้ามเปิด เพราะจะบอกญาติว่าคัดแล้วทั้งที่ยังไม่ได้คัด
 *   3. ส่ง adminContact จาก response เข้า NoEligibleCaregiverState (ช่องทางยังไม่เคาะ)
 *
 * error code สองตัวด้านล่างอ่านได้ตั้งแต่ตอนนี้: BE ยังไม่ส่งมา จึงไม่มีทางเข้าเงื่อนไข ไม่กระทบพฤติกรรมเดิม
 */
export const CAREGIVER_MATCH_LIVE = false;

/** เลือกผู้ดูแลที่ไม่ผ่านเงื่อนไขแล้ว (E9) — ทั้ง REST POST /bookings และ GraphQL createBookingOnBehalf */
export const CAREGIVER_NOT_ELIGIBLE = 'CAREGIVER_NOT_ELIGIBLE';
/** booking ยังกรองไม่ได้ เช่นยังไม่มีระดับ / Required Skills (E2) */
export const BOOKING_NOT_MATCHABLE = 'BOOKING_NOT_MATCHABLE';

/**
 * ช่องทางติดต่อแอดมิน (AC7) — ค่าจาก API ไม่ hardcode ในหน้า · ชนิดช่องทางยังไม่เคาะ (LINE / โทรศัพท์ / ฟอร์มในแอป)
 * `url` = ลิงก์ที่ปุ่มพาไป (line.me/…, tel:…, หรือหน้าฟอร์ม) · `display` = บรรทัดรองใต้ปุ่ม เช่น @payung หรือเบอร์
 */
export interface AdminContact {
  channel: string;
  url?: string | null;
  display?: string | null;
}

/** code ของ error จาก REST body (`{ code }`) หรือ GraphQL extensions — 422 ของ GraphQL มาเป็น ServerError ก็อ่านได้ */
export function matchErrorCode(source: unknown): string | undefined {
  const restCode = (source as { code?: unknown } | null)?.code;
  if (typeof restCode === 'string') return restCode;
  const code = extractGraphQLErrorExtensions(source)?.code;
  return typeof code === 'string' ? code : undefined;
}

export function isCaregiverNotEligibleError(source: unknown): boolean {
  return matchErrorCode(source) === CAREGIVER_NOT_ELIGIBLE;
}

export function isBookingNotMatchableError(source: unknown): boolean {
  return matchErrorCode(source) === BOOKING_NOT_MATCHABLE;
}

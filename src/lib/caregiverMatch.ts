import { extractGraphQLErrorExtensions } from './apolloErrors';

/**
 * รายชื่อผู้ดูแลตามเงื่อนไขของ booking (S18 · PYG-648) — จุดเชื่อมกับ BE (contract PYG-646)
 *
 * ลำดับการจอง (hooks/useMatchingBooking.ts):
 *   ขั้นตรวจสอบ → สร้าง booking แบบ unmatched → eligibleCaregivers(bookingId) → selectBookingCaregiver
 * BE ตรวจเงื่อนไขซ้ำตอนเลือกเสมอ — รายชื่อที่เห็นอาจเก่ากว่าข้อมูลล่าสุด (E9)
 */

/** เลือกผู้ดูแลที่ไม่ผ่านเงื่อนไขแล้ว หรือตารางไม่ว่างแล้ว (E9) */
export const CAREGIVER_NOT_ELIGIBLE = 'CAREGIVER_NOT_ELIGIBLE';
/** booking ยังกรองไม่ได้ เช่นยังไม่มีระดับ / Required Skills (E2) */
export const BOOKING_NOT_MATCHABLE = 'BOOKING_NOT_MATCHABLE';
/** booking ไม่ใช่ unmatched แล้ว — เลือกผู้ดูแลไปแล้ว / ยกเลิก / ยืนยันแล้ว */
export const BOOKING_NOT_SELECTABLE = 'BOOKING_NOT_SELECTABLE';

/**
 * ช่องทางติดต่อแอดมิน (AC7) — BE MatchingAdminContact จาก MATCHING_ADMIN_CONTACT_URL (https: หรือ tel:)
 * ยังไม่ตั้งค่า → BE คืน null (AC7 ยังรอ URL จริงของ Payung)
 */
export interface AdminContact {
  label: string;
  url: string;
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

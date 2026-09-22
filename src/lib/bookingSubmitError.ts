// ข้อความ error ตอนส่งคำขอจอง ใช้ร่วมกันใน SearchPage + CaregiverProfilePage
//
// เดิม error ที่ไม่ใช่ 409 ถูกกลืนแล้วพาไปหน้า /booking/success ทั้งที่ไม่มีการจองจริง
// → ทุกกรณีที่ไม่ได้ booking id กลับมา ต้องแสดง error ใน modal แทน ห้ามพาไปหน้าสำเร็จ

const MY_BOOKINGS_HINT = 'กรุณาตรวจสอบที่หน้า "การจองของฉัน" ก่อนลองใหม่ เพื่อไม่ให้จองซ้ำ';

export const BOOKING_SESSION_EXPIRED_MESSAGE = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง';

/** server ตอบสำเร็จแต่ไม่มี booking id — ไม่รู้ว่าสร้างแล้วหรือยัง */
export const BOOKING_UNCONFIRMED_MESSAGE = `ไม่สามารถยืนยันผลการจองได้ ${MY_BOOKINGS_HINT}`;

/** เกิด exception ระหว่างส่ง (เน็ตหลุด, server ไม่ตอบ ฯลฯ) — คำขออาจไปถึงหรือไม่ถึงก็ได้ */
export const BOOKING_UNKNOWN_ERROR_MESSAGE = `จองไม่สำเร็จ อาจเกิดจากการเชื่อมต่อขัดข้อง ${MY_BOOKINGS_HINT}`;

/** NestJS ส่ง message เป็น string หรือ string[] (validation) */
function serverMessage(body: unknown): string | null {
  const msg = (body as { message?: unknown } | null)?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (Array.isArray(msg)) {
    const parts = msg.filter((m): m is string => typeof m === 'string' && m.trim() !== '');
    if (parts.length) return parts.join(', ');
  }
  return null;
}

/**
 * PYG-502 — BE ปฏิเสธเพราะผู้ใช้ยังไม่ได้กรอก Onboarding
 *
 * ★ optional chain ทั้งเส้นเพราะ **BE ยังไม่ส่ง code นี้มาเลย** (เป็นของ PYG-499
 *   ซึ่งยังไม่ได้ทำ) เขียนรองรับไว้ก่อนเพื่อให้วันที่ BE ขึ้นแล้ว FE ไม่ต้องแก้
 *   และตอนนี้ไม่มีทางเข้าเงื่อนไขนี้ จึงไม่กระทบพฤติกรรมเดิม
 */
export const BOOKING_ONBOARDING_REQUIRED_CODE = 'ONBOARDING_REQUIRED';

export function isOnboardingRequiredError(body: unknown): boolean {
  const code = (body as { code?: unknown } | null)?.code;
  return code === BOOKING_ONBOARDING_REQUIRED_CODE;
}

export function bookingHttpErrorMessage(status: number, body: unknown): string {
  const msg = serverMessage(body);
  // ★ ตรวจก่อน status เพราะข้อความทั่วไปของ 4xx ไม่ได้บอกว่าต้องไปกรอก Onboarding
  if (isOnboardingRequiredError(body)) {
    return msg ?? 'กรุณากรอกข้อมูลผู้รับบริการให้ครบก่อนจองผู้ดูแล';
  }
  if (status === 401) return BOOKING_SESSION_EXPIRED_MESSAGE;
  if (status === 403) return 'บัญชีนี้ไม่มีสิทธิ์สร้างการจอง';
  if (status === 409) return msg ?? 'คุณมีนัดหมายในช่วงเวลาเดียวกันอยู่แล้ว กรุณาเลือกเวลาอื่น';
  if (status >= 400 && status < 500) {
    return msg ? `ข้อมูลการจองไม่ถูกต้อง: ${msg}` : 'ข้อมูลการจองไม่ถูกต้อง กรุณาตรวจสอบรายละเอียดแล้วลองใหม่';
  }
  return `ระบบขัดข้องชั่วคราว (${status}) ${MY_BOOKINGS_HINT}`;
}

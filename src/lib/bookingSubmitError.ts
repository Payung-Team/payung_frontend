// ข้อความ error ตอนส่งคำขอจอง ใช้ร่วมกันใน SearchPage + CaregiverProfilePage
//
// เดิม error ที่ไม่ใช่ 409 ถูกกลืนแล้วพาไปหน้า /booking/success ทั้งที่ไม่มีการจองจริง
// → ทุกกรณีที่ไม่ได้ booking id กลับมา ต้องแสดง error ใน modal แทน ห้ามพาไปหน้าสำเร็จ

import { extractGraphQLErrorCode, extractGraphQLErrorMessage } from './apolloErrors';
import { CONSENT_ERROR } from '../graphql/consent';

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

/**
 * PYG-540: BE ตอบ 403 + code นี้เมื่อผู้ใช้ถอนความยินยอมที่จำเป็นต่อการจองไว้
 * (ข้อมูลสุขภาพ / การเปิดเผยแก่ผู้ดูแล) — ค่ามาจาก CONSENT_ERROR ใน graphql/consent.ts
 */
const CONSENT_WITHDRAWN_CODE = CONSENT_ERROR.WITHDRAWN;

/**
 * PYG-525 — ข้อความจาก BE ที่เป็นเรื่อง "เวลาที่เลือก" → modal ยืนยันแสดงใต้แถวเวลา
 * แทนกล่อง error รวมด้านล่าง ผู้ใช้จะรู้ทันทีว่าต้องแก้ที่เวลา
 *
 * ★ เทียบด้วยท่อนข้อความเพราะ BE ยังไม่ส่ง code แยกให้ — ข้อความต้นทาง:
 *   booking/booking-time.ts       รูปแบบเวลา / ลง :00 :30 / สิ้นสุดก่อนเริ่ม / ขั้นต่ำ-สูงสุด / ช่วงเวลาเริ่ม
 *   booking/booking.service.ts    ผู้ดูแลไม่เปิดรับช่วงนี้ (PYG-524) / นัดชนกัน (PYG-424)
 *   ถ้า BE เปลี่ยนข้อความแล้วไม่ตรง ข้อความยังแสดงครบ แค่ย้ายไปอยู่ในกล่องรวม
 */
const TIME_ERROR_FRAGMENTS = [
  'เวลาเริ่ม',
  'เวลาสิ้นสุด',
  'ต้องจองอย่างน้อย',
  'จองได้สูงสุด',
  'ไม่ได้เปิดรับงานในช่วงเวลานี้',
  'ในช่วงเวลาเดียวกัน',
];

export function isBookingTimeErrorMessage(message?: string | null): boolean {
  return !!message && TIME_ERROR_FRAGMENTS.some((f) => message.includes(f));
}

export function bookingHttpErrorMessage(status: number, body: unknown): string {
  const msg = serverMessage(body);
  // PYG-525: ข้อความเรื่องเวลาจาก BE อ่านเข้าใจอยู่แล้ว — ไม่เติมคำนำ "ข้อมูลการจองไม่ถูกต้อง:"
  if (isBookingTimeErrorMessage(msg)) return msg as string;
  // ★ ตรวจก่อน status เพราะข้อความทั่วไปของ 4xx ไม่ได้บอกว่าต้องไปกรอก Onboarding
  if (isOnboardingRequiredError(body)) {
    return msg ?? 'กรุณากรอกข้อมูลผู้รับบริการให้ครบก่อนจองผู้ดูแล';
  }
  if (status === 401) return BOOKING_SESSION_EXPIRED_MESSAGE;
  // ★ 403 เพราะถอนความยินยอม ≠ 403 "ไม่มีสิทธิ์" แบบอื่น — ข้อความจาก BE บอกทางแก้
  //   ("ให้ความยินยอมอีกครั้งได้ที่หน้า ความเป็นส่วนตัว") ถ้าแสดงข้อความกลางจะแก้ไม่ถูกจุด
  if (status === 403 && (body as { code?: unknown } | null)?.code === CONSENT_WITHDRAWN_CODE) {
    return msg ?? 'คุณถอนความยินยอมที่จำเป็นต่อการจองไว้ ให้ความยินยอมอีกครั้งได้ที่หน้า "ความเป็นส่วนตัว"';
  }
  if (status === 403) return 'บัญชีนี้ไม่มีสิทธิ์สร้างการจอง';
  if (status === 409) return msg ?? 'คุณมีนัดหมายในช่วงเวลาเดียวกันอยู่แล้ว กรุณาเลือกเวลาอื่น';
  if (status >= 400 && status < 500) {
    return msg ? `ข้อมูลการจองไม่ถูกต้อง: ${msg}` : 'ข้อมูลการจองไม่ถูกต้อง กรุณาตรวจสอบรายละเอียดแล้วลองใหม่';
  }
  return `ระบบขัดข้องชั่วคราว (${status}) ${MY_BOOKINGS_HINT}`;
}

/**
 * ข้อความ error ของการ "จองแทนในกลุ่มครอบครัว" (GraphQL createBookingOnBehalf) — ใช้ร่วมกันใน
 * SearchPage + CaregiverProfilePage
 *
 * ★ PYG-540 แก้บั๊กเดิมไปด้วย: โค้ดเก่าอ่าน `err.graphQLErrors` ซึ่งเป็นรูปทรงของ Apollo 3
 *   บน Apollo 4 ค่านี้เป็น undefined เสมอ → ทุก error ตกไปที่ "จองแทนไม่สำเร็จ" แม้แต่
 *   RECIPIENT_NOT_IN_GROUP ที่ตั้งใจแยกไว้ · ตอนนี้อ่านผ่าน apolloErrors.ts แบบเดียวกับทั้งแอป
 */
export function onBehalfBookingErrorMessage(err: unknown): string {
  const code = extractGraphQLErrorCode(err);
  if (code === 'RECIPIENT_NOT_IN_GROUP') {
    return 'ผู้รับบริการนี้ไม่ได้อยู่ในกลุ่มแล้ว ลองเลือกผู้รับบริการใหม่';
  }
  // PYG-540: เจ้าของข้อมูลถอนความยินยอมไว้ — ข้อความจาก BE บอกเหตุผล/ทางแก้ที่ถูกต้องแล้ว
  //   (จองแทนคนอื่น: บอกกลาง ๆ ไม่เปิดเผยว่าเขาถอนข้อไหน · จองแทนตัวเอง: บอกทางแก้)
  if (code === CONSENT_WITHDRAWN_CODE) {
    return (
      extractGraphQLErrorMessage(err) ??
      'ผู้รับบริการคนนี้ยังไม่ได้ให้ความยินยอมที่จำเป็นสำหรับการจองแทน จึงจองแทนไม่ได้ในตอนนี้'
    );
  }
  // PYG-525: เวลาผิดกฎ / ผู้ดูแลไม่ว่าง / นัดชน — ใช้ข้อความจาก BE ตรง ๆ ผู้ใช้จะรู้ว่าต้องเปลี่ยนเวลา
  //   (เดิมทุกกรณีตกไปที่ "จองแทนไม่สำเร็จ" ซึ่งไม่บอกว่าต้องแก้อะไร)
  const message = extractGraphQLErrorMessage(err);
  if (isBookingTimeErrorMessage(message)) return message as string;
  return 'จองแทนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
}

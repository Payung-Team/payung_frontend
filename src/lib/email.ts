/**
 * อีเมล — กติกาเดียวทุกหน้า (PYG-708 · QA PYG-706)
 *
 * ★ ตรงกับ BE `@ValidAppEmail()` (payung_backend src/common/validators/valid-app-email.validator.ts · PYG-707)
 *   แก้ที่หนึ่งต้องแก้อีกที่ — ไม่งั้นหน้าจอปล่อยผ่านแล้วไปเจอ 400 จาก BE
 *
 * ก่อนตรวจ (normalizeEmail): ตัดช่องว่าง/อักขระซ่อนหัวท้าย (space, tab, NBSP, BOM, zero-width) + ตัวเล็ก
 *   อักขระซ่อนที่อยู่ "ข้างใน" ไม่ตัด → ไม่ผ่าน
 * กฎ: ASCII เท่านั้น · หน้า @ a-z 0-9 . _ % + - (1–64, ไม่มีจุดหัว/ท้าย/ติดกัน)
 *     domain แต่ละส่วน a-z 0-9 - (1–63, ไม่ขึ้นต้น/ลงท้ายด้วย -) · TLD ตัวอักษร ≥ 2 · ไม่รับ IP · รวม ≤ 254
 */

export const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_MAX_LENGTH = 64;

export const EMAIL_REQUIRED_MESSAGE = 'กรุณากรอกอีเมล';
export const EMAIL_FORMAT_MESSAGE = 'กรุณากรอกอีเมลให้ถูกต้อง';

const LOCAL = '[a-z0-9_%+-]+(?:\\.[a-z0-9_%+-]+)*';
const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const EMAIL_PATTERN = new RegExp(`^${LOCAL}@(?:${LABEL}\\.)+[a-z]{2,63}$`);
/** String.trim() ไม่ตัด zero-width (U+200B–U+200D) และ word joiner (U+2060) */
const EDGE_INVISIBLE = /^[\s\u200b-\u200d\u2060\ufeff]+|[\s\u200b-\u200d\u2060\ufeff]+$/g;

/** ค่าที่จะส่ง API — ใช้ค่านี้เสมอ ไม่ส่งค่าที่ผู้ใช้พิมพ์ดิบ ๆ */
export function normalizeEmail(value: string): string {
  return value.replace(EDGE_INVISIBLE, '').toLowerCase();
}

/** ตรวจค่าที่ผู้ใช้พิมพ์ (normalize ให้ในตัว) */
export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value);
  if (email.length > EMAIL_MAX_LENGTH) return false;
  const at = email.indexOf('@');
  if (at < 1 || at > EMAIL_LOCAL_MAX_LENGTH) return false;
  return EMAIL_PATTERN.test(email);
}

/**
 * ข้อความ error ใต้ช่อง หรือ '' เมื่อผ่าน
 * required: false → ช่องว่างผ่าน (เช่น บัญชีที่สมัครด้วยเบอร์ไม่มีอีเมล)
 */
export function emailError(value: string, { required = true } = {}): string {
  if (!normalizeEmail(value)) return required ? EMAIL_REQUIRED_MESSAGE : '';
  return isValidEmail(value) ? '' : EMAIL_FORMAT_MESSAGE;
}

/**
 * เบอร์มือถือไทย — จัดรูปแบบ ตรวจ และแปลงค่า (PYG-604)
 *
 * ฝั่งหน้าจอทำงานกับ "ตัวเลข 10 หลักขึ้นต้น 0" เสมอ แล้วแปลงเป็น E.164 ตอนส่ง API เท่านั้น
 * R4 ของ story: เบอร์เดียวกันที่พิมพ์ต่างรูปแบบ (0 / +66 / มีขีด) ต้องเป็นเบอร์เดียวกัน
 */

/**
 * เปิดทางเลือกเบอร์โทรศัพท์ในหน้า Login / สมัคร / ตั้งค่า
 * ปิดไว้จนกว่า BE (PYG-603) จะ deploy — operation ของเบอร์โทรยังไม่มีใน schema
 * ถ้าเปิดก่อน ผู้ใช้จะเจอแท็บเบอร์โทรเป็นค่าเริ่มต้นแต่กดแล้ว error ทุกครั้ง
 */
export const PHONE_AUTH_ENABLED = import.meta.env.VITE_PHONE_AUTH_ENABLED === 'true';

export const PHONE_DIGITS = 10;

/** เหลือแต่ตัวเลข แปลง 66 นำหน้าเป็น 0 และตัดให้ไม่เกิน 10 หลัก */
export function nationalDigits(value: string | null | undefined): string {
  let digits = (value ?? '').replace(/\D/g, '');
  if (digits.startsWith('66') && digits.length >= 3) digits = `0${digits.slice(2)}`;
  // "+66 081..." — คนที่พิมพ์รหัสประเทศแล้วยังใส่ 0 นำหน้าเบอร์
  if (digits.startsWith('00')) digits = digits.slice(1);
  return digits.slice(0, PHONE_DIGITS);
}

/** "0812345678" → "081 234 5678" (รับค่าที่ยังพิมพ์ไม่ครบได้) */
export function formatThaiPhone(value: string | null | undefined): string {
  const digits = nationalDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** "0812345678" → "081 XXX 5678" — ใช้ในหน้ากรอกรหัส ไม่โชว์เบอร์เต็ม */
export function maskThaiPhone(value: string | null | undefined): string {
  const digits = nationalDigits(value);
  if (digits.length < PHONE_DIGITS) return formatThaiPhone(digits);
  return `${digits.slice(0, 3)} XXX ${digits.slice(-4)}`;
}

/** "0812345678" → "+66812345678" — รูปแบบที่ส่งให้ API */
export function toE164(value: string): string {
  return `+66${nationalDigits(value).slice(1)}`;
}

export type PhoneInputIssue = 'required' | 'prefix' | 'length';

/**
 * ตรวจเบอร์ที่กำลังพิมพ์
 *
 * @param strict false = ระหว่างพิมพ์ เตือนเฉพาะสิ่งที่ผิดแน่นอนแล้ว (ขึ้นต้นผิด)
 *               true  = ออกจากช่องหรือกดส่งแล้ว เตือนเรื่องว่างและไม่ครบด้วย
 *               ถ้าเตือน "ไม่ครบ" ตั้งแต่ตัวแรก ช่องจะแดงตลอดจนครบ 10 หลัก
 */
export function phoneInputIssue(digits: string, strict: boolean): PhoneInputIssue | null {
  if (!digits) return strict ? 'required' : null;
  // "6" / "66" = กำลังพิมพ์รหัสประเทศ ยังตัดสินไม่ได้
  const typingCountryCode = digits === '6' || digits === '66';
  const badPrefix = digits[0] !== '0' || (digits.length > 1 && !'689'.includes(digits[1]));
  if (!typingCountryCode && badPrefix) return 'prefix';
  if (digits.length < PHONE_DIGITS) return strict ? 'length' : null;
  return null;
}

export function isValidThaiMobile(digits: string): boolean {
  return digits.length === PHONE_DIGITS && phoneInputIssue(digits, true) === null;
}

/**
 * ช่องทางติดต่อที่ใช้แสดงแทนอีเมลของบัญชี — บัญชีที่สมัครด้วยเบอร์ไม่มีอีเมล (E13, E14)
 * คืน '' เมื่อไม่มีทั้งสองอย่าง ห้ามปล่อยให้ null/undefined ไปถึงหน้าจอ
 */
export function accountContact(account: { email?: string | null; phone?: string | null } | null | undefined): string {
  return account?.email || formatThaiPhone(account?.phone) || '';
}

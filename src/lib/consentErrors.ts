import { CONSENT_ERROR } from '../graphql/consent';
import {
  extractGraphQLErrorCode,
  extractGraphQLErrorMessage,
} from './apolloErrors';

/**
 * ข้อความ error ของหน้า "ความเป็นส่วนตัว" (ถอน / ให้ความยินยอม) — PYG-540
 *
 * ★ code มาจาก CONSENT_ERROR ใน graphql/consent.ts (ชุดเดียวกับหน้าสมัคร/Onboarding)
 *   BE เป็นเจ้าของสัญญานี้ FE แค่แยกทางตาม code — ห้ามเดาจากข้อความ (ข้อความเปลี่ยนได้ code ไม่เปลี่ยน)
 */

/** อีเมลช่องทางใช้สิทธิ์ตาม PDPA — ต้องตรงกับ DATA_CONTROLLER.email ฝั่ง BE */
export const PRIVACY_EMAIL = 'privacy@payung.app';

// ข้อความที่ FE อยากพูดเองสำหรับบาง code
// ★ code ที่ไม่อยู่ในนี้ → ใช้ข้อความจาก BE (เป็นภาษาไทยและตั้งใจให้แสดงตรง ๆ อยู่แล้ว)
const MESSAGES: Record<string, string> = {
  [CONSENT_ERROR.VERSION_MISMATCH]:
    'ประกาศความเป็นส่วนตัวมีฉบับใหม่ เราโหลดข้อความล่าสุดให้แล้ว กรุณาอ่านอีกครั้งก่อนให้ความยินยอม',
  [CONSENT_ERROR.TYPE_INVALID]:
    'ข้อมูลความยินยอมไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บแล้วลองอีกครั้ง',
};

/**
 * ข้อความที่จะแสดงเมื่อถอน/ให้ความยินยอมไม่สำเร็จ
 * ลำดับ: ข้อความของ FE ตาม code → ข้อความจาก BE → ข้อความกลาง
 */
export function consentErrorMessage(err: unknown): string {
  const code = extractGraphQLErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return (
    extractGraphQLErrorMessage(err) ??
    'บันทึกไม่สำเร็จ อาจเกิดจากการเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง'
  );
}

/** เป็น error "นโยบายขึ้นฉบับใหม่" ไหม — ต้องโหลดข้อความใหม่ให้ผู้ใช้อ่านก่อน */
export function isPolicyVersionMismatch(err: unknown): boolean {
  return extractGraphQLErrorCode(err) === CONSENT_ERROR.VERSION_MISMATCH;
}

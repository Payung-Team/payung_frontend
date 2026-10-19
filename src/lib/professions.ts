/**
 * วิชาชีพผู้ดูแล (PYG-556 · S01) — ค่าต้องตรงกับ CHECK caregivers_profession_check ใน DB
 * แหล่งเดียวของชื่อ ไอคอน คำอธิบาย และข้อความ error ของวิชาชีพทั้ง FE
 */
import { extractGraphQLErrorCode } from './apolloErrors';

export const PROFESSION_CODES = ['general_caregiver', 'nurse', 'physiotherapist'] as const;
export type Profession = (typeof PROFESSION_CODES)[number];

interface ProfessionMeta {
  label: string;
  /** Material Icons Outlined */
  icon: string;
  /** ใต้ชื่อในตัวเลือก KYC */
  description: string;
  /** หน้าโปรไฟล์ฝั่ง Elder */
  fullDescription: string;
  requiresLicense: boolean;
  /** ชื่อใบอนุญาตที่ต้องแนบ (เฉพาะวิชาชีพที่ requiresLicense) */
  licenseName?: string;
}

export const PROFESSIONS: Record<Profession, ProfessionMeta> = {
  general_caregiver: {
    label: 'ผู้ดูแลทั่วไป',
    icon: 'volunteer_activism',
    description: 'ดูแลกิจวัตรประจำวัน เช่น อาบน้ำ ป้อนอาหาร พาเดิน',
    fullDescription: 'ดูแลกิจวัตรประจำวันและเป็นเพื่อน ไม่ทำหัตถการทางการแพทย์',
    requiresLicense: false,
  },
  nurse: {
    label: 'พยาบาล',
    icon: 'medical_services',
    description: 'มีใบอนุญาตประกอบวิชาชีพการพยาบาล',
    fullDescription: 'มีใบอนุญาตประกอบวิชาชีพการพยาบาล ทำหัตถการพยาบาล เช่น ฉีดยา ทำแผล ได้',
    requiresLicense: true,
    licenseName: 'ใบอนุญาตประกอบวิชาชีพการพยาบาลและการผดุงครรภ์',
  },
  physiotherapist: {
    label: 'นักกายภาพบำบัด',
    icon: 'accessibility_new',
    description: 'มีใบอนุญาตประกอบวิชาชีพกายภาพบำบัด',
    fullDescription: 'มีใบอนุญาตประกอบวิชาชีพกายภาพบำบัด ทำกายภาพฟื้นฟูร่างกายได้',
    requiresLicense: true,
    licenseName: 'ใบอนุญาตประกอบวิชาชีพกายภาพบำบัด',
  },
};

export const LICENSE_NOTICE = 'ต้องแนบใบประกอบวิชาชีพในขั้นตอน "เอกสาร"';

export function isProfession(value: unknown): value is Profession {
  return typeof value === 'string' && (PROFESSION_CODES as readonly string[]).includes(value);
}

/** ป้ายของค่าที่ FE ยังไม่รู้จัก (BE เพิ่มค่าใหม่ก่อน FE · contract PYG-573 §8) */
export const UNKNOWN_PROFESSION = { label: 'วิชาชีพอื่น', icon: 'badge' };

/** error code จาก API (contract PYG-573 §5.2) → ข้อความที่ผู้ใช้อ่านเข้าใจ */
export const PROFESSION_ERROR_MESSAGES: Record<string, string> = {
  PROFESSION_REQUIRED: 'กรุณาเลือกวิชาชีพ',
  PROFESSION_INVALID: 'วิชาชีพที่เลือกไม่ถูกต้อง กรุณาเลือกใหม่อีกครั้ง',
  PROFESSION_CHANGE_NOT_ALLOWED: 'ขอเปลี่ยนวิชาชีพได้หลังยืนยันตัวตนผ่านแล้วเท่านั้น',
  PROFESSION_UNCHANGED: 'วิชาชีพใหม่ต้องไม่ซ้ำกับวิชาชีพปัจจุบัน',
  PROFESSION_CHANGE_ALREADY_PENDING: 'มีคำขอเปลี่ยนวิชาชีพที่รอตรวจอยู่แล้ว ส่งได้ทีละ 1 คำขอ',
  PROFESSION_CHANGE_NOT_FOUND: 'ไม่พบคำขอเปลี่ยนวิชาชีพนี้',
  PROFESSION_CHANGE_NOT_PENDING: 'คำขอนี้ไม่ได้อยู่ระหว่างรอตรวจแล้ว',
  // PYG-663: แอดมินอนุมัติคำขอที่ใบประกอบฯ ใช้ไม่ได้แล้ว / คำขอเก่าที่ไม่มีใบ
  PROFESSION_CHANGE_LICENSE_UNUSABLE: 'อนุมัติไม่ได้ ใบประกอบวิชาชีพของคำขอนี้ใช้ไม่ได้แล้ว (ไม่มีใบ / ถูกปฏิเสธ / หมดอายุ) · ปฏิเสธคำขอแล้วให้ผู้ดูแลยื่นใหม่พร้อมใบใหม่',
};

/** ข้อความของ error วิชาชีพ — null = ไม่ใช่ error ของวิชาชีพ */
export function professionErrorMessage(err: unknown): string | null {
  const code = extractGraphQLErrorCode(err);
  return (code && PROFESSION_ERROR_MESSAGES[code]) || null;
}

/** error ที่ต้องกลับไปแก้ช่องวิชาชีพในฟอร์ม KYC */
export function isKycProfessionError(err: unknown): boolean {
  const code = extractGraphQLErrorCode(err);
  return code === 'PROFESSION_REQUIRED' || code === 'PROFESSION_INVALID';
}

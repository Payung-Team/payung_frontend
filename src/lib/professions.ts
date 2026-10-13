/**
 * วิชาชีพผู้ดูแล (PYG-556 · S01) — ค่าต้องตรงกับ CHECK caregivers_profession_check ใน DB
 * แหล่งเดียวของชื่อ ไอคอน และคำอธิบายวิชาชีพทั้ง FE
 */

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

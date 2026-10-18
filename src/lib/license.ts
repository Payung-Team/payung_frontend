/**
 * ใบประกอบวิชาชีพใน KYC (PYG-588 · S03 / PYG-558) — กติกาฝั่ง FE ที่ต้องตรงกับ BE (PYG-587)
 *
 * contract อ้างอิง branch `feature/PYG-587` ของ payung_backend (PYG-585 ยังไม่เคาะ)
 *   - เอกสาร doc_type = 'professional_license' ส่งเลข + วันหมดอายุมากับ uploadKycDocument ในครั้งเดียว
 *   - วันหมดอายุเทียบตามปฏิทินไทย (Asia/Bangkok) · วันนี้ไม่นับเป็นอนาคต (R3 / E3 / E4)
 *   - error ตอบ 422 + extensions.code และ extensions.codes (ทุกช่องที่ผิด)
 */
import { PROFESSIONS, isProfession } from './professions';
import { extractGraphQLErrorExtensions } from './apolloErrors';

/**
 * เปิดส่วนใบประกอบฯ ทั้งฝั่งผู้ดูแลและแอดมิน
 * ปิดไว้จนกว่า BE (PYG-587) จะ deploy — schema ยังไม่มี licenseNumber / expiresAt / license / approveLicense
 * ถ้าเปิดก่อน GraphQL จะปฏิเสธทั้ง operation (หน้า KYC และหน้า review โหลดไม่ขึ้น)
 */
export const LICENSE_KYC_ENABLED = import.meta.env.VITE_LICENSE_KYC_ENABLED === 'true';

export const LICENSE_DOC_TYPE = 'professional_license';
/** ตรงกับ LICENSE_NUMBER_MAX_LENGTH ของ BE (หลังตัดช่องว่างหัวท้าย) */
export const LICENSE_NUMBER_MAX_LENGTH = 50;
/** ชุดเดียวกับเอกสาร KYC อื่น (KycStep2) */
export const LICENSE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export const LICENSE_MAX_SIZE = 5 * 1024 * 1024;

/** วิชาชีพนี้ต้องแนบใบประกอบฯ ไหม — อ่านจาก PROFESSIONS ที่เดียว (requiresLicense) */
export function requiresLicense(profession: string | null | undefined): boolean {
  return isProfession(profession) && PROFESSIONS[profession].requiresLicense;
}

// ── วันที่ตามปฏิทินไทย ──────────────────────────────────────────────────────

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** วันนี้ (หรือ + offset วัน) ตามปฏิทินไทย เป็น 'YYYY-MM-DD' — ไม่ขึ้นกับเขตเวลาของเครื่อง */
export function bangkokYmd(offsetDays = 0, now: Date = new Date()): string {
  return new Date(now.getTime() + BANGKOK_OFFSET_MS + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' ที่เป็นวันจริง (กัน 31/02) */
export function isValidYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** วันหมดอายุอยู่หลังวันนี้ตามปฏิทินไทย — วันนี้ไม่นับ */
export function isFutureBangkokDate(ymd: string, now: Date = new Date()): boolean {
  return isValidYmd(ymd) && ymd > bangkokYmd(0, now);
}

/** instant จาก BE (สิ้นวันเวลาไทย) → 'YYYY-MM-DD' ตามปฏิทินไทย */
export function toBangkokYmd(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

/** จำนวนวันจากวันนี้ (ไทย) ถึงวันหมดอายุ — ติดลบ = เลยมาแล้ว */
export function daysUntilBangkok(ymd: string, now: Date = new Date()): number {
  if (!isValidYmd(ymd)) return NaN;
  const today = Date.parse(`${bangkokYmd(0, now)}T00:00:00Z`);
  return Math.round((Date.parse(`${ymd}T00:00:00Z`) - today) / DAY_MS);
}

// ── สถานะ ───────────────────────────────────────────────────────────────────

export type LicenseStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'unknown';

/** ค่าจาก BE → สถานะที่หน้าจอรู้จัก · ค่าใหม่ที่ไม่รู้จักตกเป็น 'unknown' (ไม่พัง ไม่เดา) */
export function normalizeLicenseStatus(value: string | null | undefined): LicenseStatus {
  switch (value) {
    case 'pending':
    case 'approved':
    case 'rejected':
    case 'expired':
      return value;
    case null:
    case undefined:
      return 'pending';
    default:
      return 'unknown';
  }
}

/** ใบนี้ยังใช้ส่ง KYC ได้ไหม — ใบที่ถูกปฏิเสธ/หมดอายุแล้ว BE ไม่นับ (E6) ต้องแนบใบใหม่ */
export function isUsableLicenseStatus(status: LicenseStatus): boolean {
  return status === 'pending' || status === 'approved';
}

// ── ข้อมูลใบประกอบฯ จาก API ─────────────────────────────────────────────────

/** LicenseInfo ของ BE (kycStatus.license / adminKycDetail.license) */
export interface LicenseInfo {
  documentId: string;
  licenseNumber: string | null;
  fileName: string;
  signedUrl: string | null;
  expiresAt: string | null;
  status: string;
  rejectionReason: string | null;
}

// ── error จาก API ───────────────────────────────────────────────────────────

export const LICENSE_ERROR_CODES = [
  'LICENSE_NUMBER_REQUIRED',
  'LICENSE_NUMBER_TOO_LONG',
  'LICENSE_FILE_REQUIRED',
  'LICENSE_EXPIRY_REQUIRED',
  'LICENSE_EXPIRY_NOT_FUTURE',
  'LICENSE_REJECT_REASON_REQUIRED',
  'LICENSE_EXPIRED',
] as const;
export type LicenseErrorCode = (typeof LICENSE_ERROR_CODES)[number];

function isLicenseErrorCode(value: unknown): value is LicenseErrorCode {
  return typeof value === 'string' && (LICENSE_ERROR_CODES as readonly string[]).includes(value);
}

/**
 * error code ของใบประกอบฯ ทั้งหมดใน error นี้ — [] = ไม่ใช่ error ของใบประกอบฯ
 * BE ส่ง `codes` เมื่อผิดหลายช่องพร้อมกัน และ `code` = ช่องแรก
 */
export function licenseErrorCodes(err: unknown): LicenseErrorCode[] {
  const ext = extractGraphQLErrorExtensions(err);
  if (!ext) return [];
  const codes = Array.isArray(ext.codes) ? ext.codes.filter(isLicenseErrorCode) : [];
  if (codes.length > 0) return codes;
  return isLicenseErrorCode(ext.code) ? [ext.code] : [];
}

export type LicenseField = 'licenseNumber' | 'expiresAt' | 'file';

/** code → ช่องที่ต้องแสดง error ใต้ช่อง (ไม่ใช่ทุก code ผูกกับช่อง) */
export const LICENSE_ERROR_FIELD: Partial<Record<LicenseErrorCode, LicenseField>> = {
  LICENSE_NUMBER_REQUIRED: 'licenseNumber',
  LICENSE_NUMBER_TOO_LONG: 'licenseNumber',
  LICENSE_EXPIRY_REQUIRED: 'expiresAt',
  LICENSE_EXPIRY_NOT_FUTURE: 'expiresAt',
  LICENSE_FILE_REQUIRED: 'file',
};

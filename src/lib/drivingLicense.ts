/**
 * ใบขับขี่ใน KYC (PYG-598 · S06 / PYG-561) — กติกาฝั่ง FE ที่ต้องตรงกับ BE (PYG-597)
 *
 * contract อ้างอิง src/schema.gql ของ payung_backend `dev` (PYG-596 ยังไม่เคาะ)
 *   - เอกสาร doc_type = 'driving_license' ส่งวันหมดอายุมากับ uploadKycDocument ในครั้งเดียว (ไม่มีเลขใบขับขี่)
 *   - KycInput.transportMode (PYG-661/662) = คำตอบ 3 แบบ BE เก็บที่ caregivers.transport_mode · SELF_DRIVE → บังคับใบขับขี่
 *     ในรอบนี้ (DRIVING_LICENSE_REQUIRED) · ยังส่ง selfDriveTransport คู่กันเพื่อ BE เก่า
 *   - kycStatus.transportMode = คำตอบที่เก็บไว้ · null = ไม่เคยตอบ (ผู้ดูแลเดิม · E11) → ฟอร์มว่างให้เลือก
 *   - updateTransportMode(mode) = เปลี่ยนวิธีรับส่งหลัง KYC อนุมัติ (ป้ายใบขับขี่ฝั่ง Elder ขึ้นเฉพาะ SELF_DRIVE)
 *   - สถานะ "หมดอายุ" และ "ผ่านการตรวจ" BE คำนวณให้ (isExpired / verified) — FE ห้ามคำนวณเอง
 *   - เอกสารจับคู่กับผู้ดูแลด้วย user_id ด้วย → อัปโหลดใบใหม่หลัง KYC อนุมัติแล้วได้ด้วย uploadKycDocument ตรง ๆ
 */
import { extractGraphQLErrorExtensions } from './apolloErrors';

/**
 * เปิดส่วนใบขับขี่ทั้งฝั่งผู้ดูแลและแอดมิน
 * ปิดไว้จนกว่า BE (PYG-597) จะ deploy บน environment เดียวกัน — ถ้าเปิดก่อน
 * GraphQL จะปฏิเสธทั้ง operation (หน้า KYC และหน้า review โหลดไม่ขึ้น) แบบเดียวกับ VITE_LICENSE_KYC_ENABLED
 */
export const DRIVING_LICENSE_KYC_ENABLED = import.meta.env.VITE_DRIVING_LICENSE_KYC_ENABLED === 'true';

export const DRIVING_LICENSE_DOC_TYPE = 'driving_license';

/** คำตอบ "คุณขับรถรับส่งผู้รับการดูแลเองหรือไม่" · '' = ยังไม่ตอบ (ไม่มีค่าเริ่มต้น · E10 / E11) */
export type TransportChoice = '' | 'self' | 'hire' | 'none';

/** enum TransportMode ของ BE (PYG-661) */
export type TransportMode = 'SELF_DRIVE' | 'HIRED_RIDE' | 'NONE';

const CHOICE_TO_MODE: Record<Exclude<TransportChoice, ''>, TransportMode> = {
  self: 'SELF_DRIVE',
  hire: 'HIRED_RIDE',
  none: 'NONE',
};

export function transportChoiceToMode(choice: TransportChoice): TransportMode | null {
  return choice ? CHOICE_TO_MODE[choice] : null;
}

/** ค่าจาก BE → ตัวเลือกบนจอ · null / ค่าที่ไม่รู้จัก = ยังไม่ตอบ (ไม่เดาให้ · E10 / E11) */
export function transportModeToChoice(mode: string | null | undefined): TransportChoice {
  const found = (Object.keys(CHOICE_TO_MODE) as Array<Exclude<TransportChoice, ''>>).find((c) => CHOICE_TO_MODE[c] === mode);
  return found ?? '';
}

export const TRANSPORT_OPTIONS: ReadonlyArray<{ id: Exclude<TransportChoice, ''>; icon: string }> = [
  { id: 'self', icon: 'directions_car' },
  { id: 'hire', icon: 'local_taxi' },
  { id: 'none', icon: 'block' },
];

/** DrivingLicenseInfo ของ BE (kycStatus.drivingLicense / adminKycDetail.drivingLicense) */
export interface DrivingLicenseInfo {
  documentId: string | null;
  fileName: string | null;
  signedUrl: string | null;
  expiresAt: string | null;
  /** none | pending | approved | rejected — ค่าอื่นต้อง fallback */
  status: string;
  rejectionReason: string | null;
  isExpired: boolean;
  verified: boolean;
}

export type DrivingLicenseStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'expired' | 'unknown';

/** ค่าจาก BE → สถานะที่หน้าจอแสดง · หมดอายุอ่านจาก isExpired ของ BE เท่านั้น (ไม่ใช้นาฬิกาเครื่อง) */
export function drivingLicenseStatus(info: DrivingLicenseInfo | null | undefined): DrivingLicenseStatus {
  if (!info) return 'none';
  if (info.status !== 'none' && info.isExpired) return 'expired';
  switch (info.status) {
    case 'none':
    case 'pending':
    case 'approved':
    case 'rejected':
      return info.status;
    default:
      return 'unknown';
  }
}

/** ใบนี้ยังใช้ส่ง KYC ได้ไหม — ใบที่ถูกปฏิเสธ/หมดอายุแล้ว BE ไม่รับ (E7) ต้องอัปโหลดใบใหม่ */
export function isUsableDrivingLicense(status: DrivingLicenseStatus): boolean {
  return status === 'pending' || status === 'approved';
}

// ── error จาก API ───────────────────────────────────────────────────────────

export const DRIVING_LICENSE_ERROR_CODES = [
  'DRIVING_LICENSE_REQUIRED',
  'DRIVING_LICENSE_EXPIRY_REQUIRED',
  'DRIVING_LICENSE_EXPIRED',
  'DRIVING_LICENSE_NOT_VERIFIED',
  'REJECT_REASON_REQUIRED',
] as const;
export type DrivingLicenseErrorCode = (typeof DRIVING_LICENSE_ERROR_CODES)[number];

/** error code ของใบขับขี่ใน error นี้ — null = ไม่ใช่ error ของใบขับขี่ */
export function drivingLicenseErrorCode(err: unknown): DrivingLicenseErrorCode | null {
  const code = extractGraphQLErrorExtensions(err)?.code;
  return typeof code === 'string' && (DRIVING_LICENSE_ERROR_CODES as readonly string[]).includes(code)
    ? (code as DrivingLicenseErrorCode)
    : null;
}

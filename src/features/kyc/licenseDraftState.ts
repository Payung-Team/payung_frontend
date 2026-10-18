/**
 * ค่าเริ่มต้นและตัวช่วยของ LicenseDraft (PYG-588)
 * แยกจาก KycContext.tsx เพราะไฟล์ context export ได้แต่ component (react-refresh)
 */
import type { LicenseDraft } from '../../context/KycContext';

export const EMPTY_LICENSE_DRAFT: LicenseDraft = {
  licenseNumber: '',
  expiresAt: '',
  file: null,
  registered: null,
  previous: null,
  clearedForProfession: null,
};

/** มีอะไรที่ผู้ใช้กรอก/แนบไว้แล้วไหม — ใช้ตัดสินว่าต้องเตือนก่อนล้าง (E1 / E2) */
export function hasLicenseInput(draft: LicenseDraft | null | undefined): boolean {
  return Boolean(draft && (draft.licenseNumber.trim() || draft.expiresAt || draft.file));
}

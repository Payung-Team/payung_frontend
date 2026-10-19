/**
 * ค่าเริ่มต้นและตัวช่วยของ DrivingLicenseDraft (PYG-598)
 * แยกจาก KycContext.tsx เพราะไฟล์ context export ได้แต่ component (react-refresh)
 */
import type { DrivingLicenseDraft } from '../../context/KycContext';

export const EMPTY_DRIVING_LICENSE_DRAFT: DrivingLicenseDraft = {
  expiresAt: '',
  file: null,
  registered: null,
  previous: null,
};

/** มีอะไรที่ผู้ใช้กรอก/แนบไว้แล้วไหม — ใช้ตัดสินว่าต้องถามก่อนล้างเมื่อเปลี่ยนจาก "ขับเอง" */
export function hasDrivingLicenseInput(draft: DrivingLicenseDraft | null | undefined): boolean {
  return Boolean(draft && (draft.expiresAt || draft.file));
}

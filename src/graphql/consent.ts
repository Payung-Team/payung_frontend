/**
 * PDPA consent — ดึงข้อความจาก backend (PYG-539)
 *
 * ★ ห้ามเขียนข้อความ consent เองฝั่งนี้เด็ดขาด
 *   ถ้าข้อความสองฝั่งไม่ตรง ผู้ใช้จะเห็นฉบับหนึ่งแต่ระบบบันทึกว่ายินยอมอีกฉบับ
 *   ซึ่งทำให้หลักฐานความยินยอมใช้ไม่ได้ตามกฎหมาย — BE เป็นเจ้าของข้อความที่เดียว (PYG-472)
 */
import { gql } from '@apollo/client';

export const CONSENT_POLICY = gql`
  query ConsentPolicy($source: String) {
    consentPolicy(source: $source) {
      version
      effectiveDate
      items {
        type
        labelTh
        labelEn
        descriptionTh
        descriptionEn
        required
        sensitive
      }
      screen {
        titleTh
        titleEn
        introTh
        introEn
      }
      rightsNoteTh
      rightsNoteEn
      privacyNoticeTh
      privacyNoticeEn
    }
  }
`;

export interface ConsentItem {
  type: string;
  labelTh: string;
  labelEn: string;
  descriptionTh: string;
  descriptionEn: string;
  required: boolean;
  /** ข้อมูลอ่อนไหวตาม ม.26 — ต้องแยกกล่องและห้ามติ๊กมาให้ล่วงหน้า */
  sensitive: boolean;
}

export interface ConsentScreenCopy {
  titleTh: string;
  titleEn: string;
  introTh: string;
  introEn: string;
}

export interface ConsentPolicyData {
  consentPolicy: {
    version: string;
    effectiveDate: string;
    items: ConsentItem[];
    screen: ConsentScreenCopy | null;
    rightsNoteTh: string;
    rightsNoteEn: string;
    privacyNoticeTh: string;
    privacyNoticeEn: string;
  };
}

/** รูปทรงที่ส่งกลับไปให้ BE ตอนบันทึก */
export interface ConsentAnswer {
  type: string;
  granted: boolean;
  /** ★ ต้องเป็นค่าจาก consentPolicy.version ห้าม hardcode — BE ปฏิเสธถ้าไม่ตรง */
  policyVersion: string;
}

/** รหัส error ที่ BE ตอบกลับเมื่อความยินยอมไม่ผ่าน (PYG-538) */
export const CONSENT_ERROR = {
  /** ยังไม่ยินยอมข้อที่บังคับ */
  REQUIRED: 'CONSENT_REQUIRED',
  /** นโยบายขึ้นเวอร์ชันระหว่างที่ผู้ใช้เปิดหน้าค้างไว้ */
  VERSION_MISMATCH: 'CONSENT_POLICY_VERSION_MISMATCH',
} as const;

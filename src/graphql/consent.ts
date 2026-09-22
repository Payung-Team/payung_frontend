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

/**
 * รหัส error ที่ BE ตอบกลับเมื่อความยินยอมไม่ผ่าน (PYG-538 · PYG-474 · PYG-540)
 * สำเนาของ consent.errors.ts ฝั่ง BE — BE เป็นเจ้าของสัญญา FE แค่แยกทางตาม code
 */
export const CONSENT_ERROR = {
  /** ยังไม่ยินยอมข้อที่บังคับ */
  REQUIRED: 'CONSENT_REQUIRED',
  /** นโยบายขึ้นเวอร์ชันระหว่างที่ผู้ใช้เปิดหน้าค้างไว้ */
  VERSION_MISMATCH: 'CONSENT_POLICY_VERSION_MISMATCH',
  /** ชนิดความยินยอมที่ไม่รู้จัก / ไม่ได้ขอ ณ จุดนั้น */
  TYPE_INVALID: 'CONSENT_TYPE_INVALID',
  /** ส่งคำตอบข้อเดียวกันซ้ำในคำขอเดียว */
  DUPLICATE_ANSWER: 'CONSENT_DUPLICATE_ANSWER',
  /** PYG-540 — ข้อกำหนด / ประกาศความเป็นส่วนตัว ถอนผ่านหน้าตั้งค่าไม่ได้ */
  NOT_WITHDRAWABLE: 'CONSENT_NOT_WITHDRAWABLE',
  /** PYG-540 — จอง/จองแทนไม่ได้เพราะเจ้าของข้อมูลถอนความยินยอมไว้ */
  WITHDRAWN: 'CONSENT_WITHDRAWN',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
//  PYG-540 — หน้า "ความเป็นส่วนตัว": ดูสถานะ + ถอน / ให้ความยินยอมทีละข้อ
//
//  ★ ข้อความ (label / คำอธิบาย) ใช้ CONSENT_POLICY ข้างบน (ไม่ส่ง source = ได้ครบทุกข้อ)
//    ส่วนสถานะมาจาก MY_CONSENTS — หน้าเว็บจับคู่สองอย่างด้วย `type`
//  ★ ฟิลด์ของ ConsentStatus ซ้ำกันทั้ง 3 operation โดยตั้งใจ (ไม่ใช้ fragment)
//    ทั้งโปรเจกต์ยังไม่มีที่ไหนใช้ fragment — แก้ฟิลด์เมื่อไหร่ต้องแก้ครบทั้ง 3 ที่ + interface ข้างล่าง
// ═══════════════════════════════════════════════════════════════════════════

/** สถานะความยินยอมของผู้ใช้ที่ login อยู่ — ทุกข้อที่เกี่ยวกับ role เรียงตามที่ BE กำหนด */
export const MY_CONSENTS = gql`
  query MyConsents {
    myConsents {
      type
      granted
      answered
      policyVersion
      answeredAt
      source
      isCurrentVersion
      required
      withdrawable
    }
  }
`;

/** ถอนความยินยอมหนึ่งข้อ — BE เขียนแถวใหม่ granted = false (ไม่ลบของเดิม) */
export const WITHDRAW_CONSENT = gql`
  mutation WithdrawConsent($type: String!) {
    withdrawConsent(type: $type) {
      type
      granted
      answered
      policyVersion
      answeredAt
      source
      isCurrentVersion
      required
      withdrawable
    }
  }
`;

/**
 * ให้ความยินยอม (กลับ) หนึ่งข้อ
 *
 * ★ policyVersion ต้องมาจาก consentPolicy.version ที่ผู้ใช้เพิ่งอ่านเท่านั้น — ห้าม hardcode
 *   BE ใช้ค่านี้พิสูจน์ว่า "ผู้ใช้ยินยอมข้อความฉบับไหน" ถ้าไม่ตรงกับฉบับที่บังคับใช้อยู่
 *   จะตอบ CONSENT_POLICY_VERSION_MISMATCH
 */
export const GRANT_CONSENT = gql`
  mutation GrantConsent($type: String!, $policyVersion: String!) {
    grantConsent(type: $type, policyVersion: $policyVersion) {
      type
      granted
      answered
      policyVersion
      answeredAt
      source
      isCurrentVersion
      required
      withdrawable
    }
  }
`;

// ─── Types (PYG-540) ──────────────────────────────────────────────────────────────────

export interface ConsentStatus {
  type: string;
  /** ยินยอมอยู่ไหม — ยังไม่เคยตอบถือว่า false */
  granted: boolean;
  /** เคยตอบข้อนี้แล้วหรือยัง (false = ยังไม่เคยถูกถาม) */
  answered: boolean;
  policyVersion: string | null;
  /** ISO string ของเวลาที่ตอบล่าสุด */
  answeredAt: string | null;
  source: string | null;
  isCurrentVersion: boolean;
  required: boolean;
  /** false = ข้อกำหนดการใช้บริการ / ประกาศความเป็นส่วนตัว (ถอนผ่านหน้านี้ไม่ได้) */
  withdrawable: boolean;
}

export interface MyConsentsData {
  myConsents: ConsentStatus[];
}

export interface WithdrawConsentData {
  withdrawConsent: ConsentStatus;
}

export interface WithdrawConsentVars {
  type: string;
}

export interface GrantConsentData {
  grantConsent: ConsentStatus;
}

export interface GrantConsentVars {
  type: string;
  policyVersion: string;
}

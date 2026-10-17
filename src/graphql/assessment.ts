/**
 * แบบประเมิน ADL + เงื่อนไขพิเศษ (Flags) ของผู้สูงอายุ — S08 · PYG-610 (contract ตาม PYG-607)
 *
 * ★ ข้อมูลสุขภาพ: ห้าม log variables / response ของไฟล์นี้ และห้ามเก็บลง localStorage
 * ★ บันทึกได้เฉพาะเจ้าของโปรไฟล์ (care_recipients.patient_id = ผู้ใช้) — คนอื่นได้ ASSESSMENT_ACCESS_DENIED
 * ★ client ไม่ส่งคะแนนรวมและไม่ส่ง Flag "ไม่แน่ใจ" — BE คำนวณเองทั้งคู่ (R3, R7)
 */
import { gql } from '@apollo/client';

const ASSESSMENT_FIELDS = gql`
  fragment CareRecipientAssessmentFields on CareRecipientAssessment {
    careRecipientId
    answers {
      code
      value
    }
    adlTotalScore
    unsureCount
    flags
    noSpecialConditions
    hasUnsureFlag
    dementiaSevere
    assessedAt
  }
`;

/** คืน null เมื่อผู้สูงอายุคนนี้ยังไม่มีแบบประเมิน */
export const CARE_RECIPIENT_ASSESSMENT = gql`
  ${ASSESSMENT_FIELDS}
  query CareRecipientAssessment($careRecipientId: ID!) {
    careRecipientAssessment(careRecipientId: $careRecipientId) {
      ...CareRecipientAssessmentFields
    }
  }
`;

/** สร้างและแก้ไขใช้ตัวเดียวกัน — ส่งทั้งชุดทุกครั้ง */
export const SUBMIT_CARE_RECIPIENT_ASSESSMENT = gql`
  ${ASSESSMENT_FIELDS}
  mutation SubmitCareRecipientAssessment($input: SubmitCareRecipientAssessmentInput!) {
    submitCareRecipientAssessment(input: $input) {
      ...CareRecipientAssessmentFields
    }
  }
`;

export interface CareRecipientAssessment {
  careRecipientId: string;
  /** value = null คือตอบ "ไม่แน่ใจ" (BE นับเป็น 0 คะแนน) */
  answers: { code: string; value: number | null }[];
  adlTotalScore: number;
  unsureCount: number;
  /** Flags ที่ญาติเลือก — ไม่มี 'unsure' (อยู่ที่ hasUnsureFlag) */
  flags: string[];
  noSpecialConditions: boolean;
  /** Flag ที่ระบบตั้งเมื่อตอบ "ไม่แน่ใจ" ตั้งแต่ 3 ข้อ */
  hasUnsureFlag: boolean;
  /** null เมื่อไม่ได้เลือก Flag สมองเสื่อม */
  dementiaSevere: boolean | null;
  assessedAt: string;
}

export interface CareRecipientAssessmentData {
  careRecipientAssessment: CareRecipientAssessment | null;
}

export interface SubmitCareRecipientAssessmentVars {
  input: {
    careRecipientId: string;
    /** ต้องครบทุกข้อ — "ไม่แน่ใจ" ส่ง value: null ไม่ใช่ตัดข้อนั้นทิ้ง (ตัดทิ้ง = ASSESSMENT_INCOMPLETE) */
    answers: { code: string; value: number | null }[];
    flags: string[];
    noSpecialConditions: boolean;
    /** ส่งเฉพาะตอนเลือก dementia — ส่งมาโดยไม่มี dementia BE ตอบ ASSESSMENT_FLAGS_CONFLICT */
    dementiaSevere: boolean | null;
  };
}

export interface SubmitCareRecipientAssessmentData {
  submitCareRecipientAssessment: CareRecipientAssessment;
}

/** extensions.code ของ BE (assessment.errors.ts) */
export const ASSESSMENT_ERROR = {
  INCOMPLETE: 'ASSESSMENT_INCOMPLETE',
  ANSWER_INVALID: 'ASSESSMENT_ANSWER_INVALID',
  FLAG_INVALID: 'ASSESSMENT_FLAG_INVALID',
  FLAGS_CONFLICT: 'ASSESSMENT_FLAGS_CONFLICT',
  ACCESS_DENIED: 'ASSESSMENT_ACCESS_DENIED',
  REQUIRED: 'ASSESSMENT_REQUIRED',
} as const;

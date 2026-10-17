// สถานะฟอร์มแบบประเมิน (S08) — ตรรกะล้วน ไม่มี UI
//
// ★ คำตอบอยู่ใน memory ของหน้าแบบประเมินเท่านั้น (E1 เคาะแล้ว: ไม่เก็บคำตอบค้าง)
//   ห้ามเขียนลง localStorage / sessionStorage — เป็นข้อมูลสุขภาพ

import { createContext } from 'react';
import type { CareRecipientAssessment, SubmitCareRecipientAssessmentVars } from '../../graphql/assessment';
import { ADL_ITEMS, DEMENTIA_FLAG, type AdlCode } from '../../lib/assessmentStrings';

/** undefined = ยังไม่ตอบ · null = "ไม่แน่ใจ" · number = คะแนนของตัวเลือก */
export type AdlAnswers = Partial<Record<AdlCode, number | null>>;

export interface FlagsValue {
  /** Flags ที่ญาติเลือก (รหัสตาม BE) */
  flags: string[];
  noSpecialConditions: boolean;
  /** มีผลเฉพาะเมื่อเลือก dementia — true = รุนแรง */
  dementiaSevere: boolean | null;
}

/**
 * true = กำลังประเมินโปรไฟล์ของตัวเอง (is_self) — ข้อความที่พูดถึง "ญาติ" / "ผู้สูงอายุคนนี้"
 * ต้องเปลี่ยนเป็นมุมของผู้ตอบเอง ตั้งค่าโดย AssessmentLayout
 */
export const AssessmentSelfContext = createContext(false);

export const EMPTY_FLAGS: FlagsValue = { flags: [], noSpecialConditions: false, dementiaSevere: null };

export function missingAdlCodes(answers: AdlAnswers): AdlCode[] {
  return ADL_ITEMS.filter((item) => answers[item.code] === undefined).map((item) => item.code);
}

export function unsureAdlCodes(answers: AdlAnswers): AdlCode[] {
  return ADL_ITEMS.filter((item) => answers[item.code] === null).map((item) => item.code);
}

/** id ของการ์ดคำถาม — ใช้ทั้งลิงก์ "ไปที่ข้อ" และการเลื่อน/โฟกัสไปข้อที่ยังไม่ตอบ */
export const adlQuestionId = (code: AdlCode) => `adl-q-${code}`;

/** ลำดับข้อ (เริ่มที่ 1) ของรหัสข้อ ADL */
export function adlNumber(code: AdlCode): number {
  return ADL_ITEMS.findIndex((item) => item.code === code) + 1;
}

/**
 * คะแนนรวมสำหรับแสดงในหน้าสรุปก่อนบันทึกเท่านั้น
 * กติกาเดียวกับ BE (PYG-607: "ไม่แน่ใจ" นับ 0) แต่ค่าที่บันทึกและแสดงหลังบันทึกคือค่าจาก BE
 */
export function previewAdlScore(answers: AdlAnswers): number {
  return ADL_ITEMS.reduce((sum, item) => sum + (answers[item.code] ?? 0), 0);
}

export function flagsComplete(value: FlagsValue): boolean {
  const hasDementia = value.flags.includes(DEMENTIA_FLAG);
  return (
    (value.noSpecialConditions || value.flags.length > 0) &&
    (!hasDementia || value.dementiaSevere !== null)
  );
}

/** ค่าเริ่มต้นตอนแก้ไขแบบประเมินเดิม */
export function fromAssessment(a: CareRecipientAssessment): { answers: AdlAnswers; flags: FlagsValue } {
  const answers: AdlAnswers = {};
  for (const item of ADL_ITEMS) {
    const found = a.answers.find((x) => x.code === item.code);
    if (found) answers[item.code] = found.value;
  }
  return {
    answers,
    flags: {
      flags: [...a.flags],
      noSpecialConditions: a.noSpecialConditions,
      dementiaSevere: a.flags.includes(DEMENTIA_FLAG) ? a.dementiaSevere : null,
    },
  };
}

/**
 * input ของ submitCareRecipientAssessment
 *
 * ★ E5: ไม่ได้เลือกสมองเสื่อม → ส่ง dementiaSevere เป็น null เสมอ (BE ปฏิเสธถ้าส่งค่ามา)
 * ★ R6: ไม่มีเงื่อนไขพิเศษ → ส่ง flags ว่างเสมอ กันค่าค้างจากการสลับไปมา
 */
export function toSubmitInput(
  careRecipientId: string,
  answers: AdlAnswers,
  value: FlagsValue,
): SubmitCareRecipientAssessmentVars['input'] {
  const flags = value.noSpecialConditions ? [] : value.flags;
  return {
    careRecipientId,
    answers: ADL_ITEMS.map((item) => ({ code: item.code, value: answers[item.code] ?? null })),
    flags,
    noSpecialConditions: value.noSpecialConditions,
    dementiaSevere: flags.includes(DEMENTIA_FLAG) ? value.dementiaSevere : null,
  };
}

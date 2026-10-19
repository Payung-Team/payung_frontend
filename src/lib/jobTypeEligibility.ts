/**
 * ประเภทงานที่ผู้ดูแลเลือกได้ (PYG-593 · S04 / PYG-559) — contract ตาม BE PYG-592
 *
 * - myJobTypeOptions: ทั้ง 5 ประเภท + selectable + blockedReason ของผู้ดูแลที่ล็อกอิน
 * - updateWorkCondition ที่มีประเภทเลือกไม่ได้ → JOB_TYPE_NOT_ALLOWED (422) ทั้งคำขอ ไม่มีอะไรถูกบันทึก
 *   extensions.blocked = [{ jobType, blockedReason }]
 *
 * FE ไม่เก็บตารางจับคู่วิชาชีพ — เลือกได้หรือไม่อ่านจาก API อย่างเดียว (กฎอยู่ที่ BE ที่เดียว)
 */
import { extractGraphQLErrorExtensions } from './apolloErrors';

export const JOB_TYPE_IDS = ['general_care', 'bedridden_care', 'physiotherapy', 'medication', 'companion'] as const;
export type JobTypeId = (typeof JOB_TYPE_IDS)[number];

export const JOB_TYPE_BLOCKED_REASONS = ['PROFESSION_MISMATCH', 'LICENSE_NOT_APPROVED', 'LICENSE_EXPIRED'] as const;
export type JobTypeBlockedReason = (typeof JOB_TYPE_BLOCKED_REASONS)[number];

export interface JobTypeOption {
  jobType: string;
  selectable: boolean;
  blockedReason: string | null;
}

export function isKnownBlockedReason(reason: string | null | undefined): reason is JobTypeBlockedReason {
  return !!reason && (JOB_TYPE_BLOCKED_REASONS as readonly string[]).includes(reason);
}

/** หน้าที่ไปแก้ได้ตามเหตุผล: วิชาชีพแจ้งที่แก้ไขโปรไฟล์ · ใบประกอบฯ อยู่ในหน้าสถานะ KYC */
export function blockedReasonLink(reason: JobTypeBlockedReason): string {
  return reason === 'PROFESSION_MISMATCH' ? '/caregiver/edit-profile' : '/kyc/status';
}

/**
 * ประเภทที่เลือกไม่ได้ → เหตุผล · ไม่มีใน map = เลือกได้
 * โหลด options ไม่สำเร็จ (BE เก่า / เน็ต) → map ว่าง = ทุกประเภทเปิดเหมือนเดิม แล้วให้ BE ตัดสินตอนบันทึก
 */
export function blockedJobTypes(options: readonly JobTypeOption[] | undefined): Map<string, string | null> {
  const blocked = new Map<string, string | null>();
  for (const option of options ?? []) {
    if (!option.selectable) blocked.set(option.jobType, option.blockedReason);
  }
  return blocked;
}

export const JOB_TYPE_NOT_ALLOWED = 'JOB_TYPE_NOT_ALLOWED';

/** ประเภทงานที่ BE ปฏิเสธใน error นี้ · null = ไม่ใช่ JOB_TYPE_NOT_ALLOWED */
export function jobTypeNotAllowedList(err: unknown): string[] | null {
  const ext = extractGraphQLErrorExtensions(err);
  if (ext?.code !== JOB_TYPE_NOT_ALLOWED) return null;
  const blocked = Array.isArray(ext.blocked) ? ext.blocked : [];
  return blocked
    .map((b) => (b && typeof b === 'object' ? (b as { jobType?: unknown }).jobType : undefined))
    .filter((t): t is string => typeof t === 'string');
}

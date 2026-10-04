/**
 * ชื่อภาษาไทยของรหัสทักษะผู้ดูแล (caregivers.skills) — แหล่งเดียวของทั้ง FE
 * เดิมก๊อปไว้ 7 ไฟล์ เพิ่มทักษะทีต้องแก้ทุกที่ · เพิ่ม/แก้ชื่อที่นี่ที่เดียว
 */
const SKILL_LABELS: Record<string, string> = {
  mobility: 'ช่วยเคลื่อนไหว',
  medication: 'ดูแลยา',
  bathing: 'อาบน้ำ / สุขอนามัย',
  cooking: 'ทำอาหาร',
  companionship: 'เป็นเพื่อนคุย',
  wound_care: 'ดูแลแผล',
  physical_therapy: 'กายภาพบำบัด',
  physiotherapy: 'กายภาพบำบัด',
  dementia_care: 'ดูแลสมองเสื่อม',
  general_care: 'ดูแลทั่วไป',
  bedridden_care: 'ดูแลผู้ป่วยติดเตียง',
  companion: 'เป็นเพื่อน/พูดคุย',
};

/** ทักษะที่ผู้ดูแลเลือกได้ตอนกรอก KYC — ลำดับตามที่แสดงบนฟอร์ม */
const SELECTABLE_SKILLS = [
  'mobility',
  'medication',
  'bathing',
  'cooking',
  'companionship',
  'wound_care',
  'physical_therapy',
  'dementia_care',
] as const;

export const SKILL_OPTIONS: ReadonlyArray<{ value: string; label: string }> = SELECTABLE_SKILLS.map(
  (value) => ({ value, label: SKILL_LABELS[value] }),
);

/** Thai label for a backend skill code; falls back to the raw value (custom / free-text skills). */
export function skillLabel(skill: string): string {
  return SKILL_LABELS[skill] ?? skill;
}

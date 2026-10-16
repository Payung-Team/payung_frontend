import type { Profession } from './professions';

/**
 * ทักษะผู้ดูแล (caregivers.skills) — แหล่งเดียวของทั้ง FE
 *
 * ทักษะกลาง = รายการเดียวกับตาราง care_skills (PYG-642) ที่ booking ใช้คำนวณทักษะที่งานต้องการ
 * จึงใช้จับคู่งานได้ตรงรหัส · ผู้ดูแลเลือกได้เฉพาะชุดนี้
 * `profession` = ทักษะเฉพาะวิชาชีพ (อนุมานจาก care_activity_professions ของกิจกรรมที่ผูกกับทักษะ)
 * ★ ถ้า BE เพิ่มคอลัมน์วิชาชีพใน care_skills หรือเปิด query รายการทักษะแล้ว ให้ดึงจาก API แทนรายการนี้
 */
export const CARE_SKILLS: ReadonlyArray<{ value: string; label: string; profession?: Profession }> = [
  { value: 'transfer_assist', label: 'ย้ายตัว / พยุงตัว' },
  { value: 'wheelchair_push', label: 'เข็นรถเข็น' },
  { value: 'feeding_assist', label: 'ป้อนอาหาร' },
  { value: 'toileting_care', label: 'เปลี่ยนผ้าอ้อม / ขับถ่าย' },
  { value: 'bathing', label: 'อาบน้ำ / เช็ดตัว' },
  { value: 'dressing_assist', label: 'ช่วยแต่งตัว' },
  { value: 'pressure_ulcer_care', label: 'ทำแผล / พลิกตัว' },
  { value: 'dementia_care', label: 'ดูแลผู้ป่วยสมองเสื่อม' },
  { value: 'glucose_diet_care', label: 'วัดน้ำตาล / คุมอาหาร' },
  { value: 'injection', label: 'ฉีดยา', profession: 'nurse' },
  { value: 'tube_feeding', label: 'ให้อาหารทางสายยาง', profession: 'nurse' },
  { value: 'suction', label: 'ดูดเสมหะ', profession: 'nurse' },
  { value: 'tracheostomy_care', label: 'ดูแลท่อเจาะคอ', profession: 'nurse' },
  { value: 'abdominal_wound_care', label: 'ทำแผลหน้าท้อง', profession: 'nurse' },
  { value: 'physiotherapy', label: 'กายภาพบำบัด', profession: 'physiotherapist' },
];

/** รหัสชุดเก่า (ก่อน PYG-642) ที่ยังค้างอยู่ใน caregivers.skills — ใช้แสดงชื่อเท่านั้น เลือกใหม่ไม่ได้ */
const LEGACY_SKILL_LABELS: Record<string, string> = {
  mobility: 'ช่วยเคลื่อนไหว',
  medication: 'ดูแลยา',
  cooking: 'ทำอาหาร',
  companionship: 'เป็นเพื่อนคุย',
  wound_care: 'ดูแลแผล',
  physical_therapy: 'กายภาพบำบัด',
  general_care: 'ดูแลทั่วไป',
  bedridden_care: 'ดูแลผู้ป่วยติดเตียง',
  companion: 'เป็นเพื่อน/พูดคุย',
};

const SKILL_LABELS: Record<string, string> = {
  ...LEGACY_SKILL_LABELS,
  ...Object.fromEntries(CARE_SKILLS.map((s) => [s.value, s.label])),
};

/** Thai label for a backend skill code; falls back to the raw value (custom / free-text skills). */
export function skillLabel(skill: string): string {
  return SKILL_LABELS[skill] ?? skill;
}

export function isCareSkill(code: string): boolean {
  return CARE_SKILLS.some((s) => s.value === code);
}

/** ทักษะเฉพาะที่วิชาชีพนี้ติ๊กไม่ได้ (รวมทักษะเฉพาะทั้งหมดเมื่อยังไม่มีวิชาชีพ) */
export function isSkillLockedFor(code: string, profession: string | null | undefined): boolean {
  const skill = CARE_SKILLS.find((s) => s.value === code);
  return !!skill?.profession && skill.profession !== profession;
}

/** ติ๊กได้และใช้จับคู่งานได้จริง = อยู่ในรายการกลาง และไม่ใช่ทักษะเฉพาะของวิชาชีพอื่น */
export function isSelectableSkill(code: string, profession: string | null | undefined): boolean {
  return isCareSkill(code) && !isSkillLockedFor(code, profession);
}

/** แยกทักษะเฉพาะที่ไม่ตรงกับวิชาชีพใหม่ออก — ใช้ตอนผู้ดูแลเปลี่ยนวิชาชีพ */
export function splitSkillsForProfession(skills: string[], profession: string | null | undefined) {
  return {
    kept: skills.filter((s) => !isSkillLockedFor(s, profession)),
    dropped: skills.filter((s) => isSkillLockedFor(s, profession)),
  };
}

// ── ทักษะอื่นๆ ที่ผู้ดูแลเพิ่มเอง — แสดงในโปรไฟล์เท่านั้น ไม่ใช้จับคู่งาน ─────────────

export const MAX_CUSTOM_SKILLS = 5;
export const MAX_CUSTOM_SKILL_LENGTH = 30;

/** ตัดช่องว่างหัวท้าย และยุบช่องว่างซ้อนเหลือช่องเดียว */
export function normalizeCustomSkill(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** คืนข้อความ error ถ้าเพิ่มไม่ได้ · null = เพิ่มได้ */
export function customSkillError(value: string, existing: string[]): string | null {
  const v = normalizeCustomSkill(value);
  if (!v) return null;
  if (v.length > MAX_CUSTOM_SKILL_LENGTH) return `ทักษะต้องไม่เกิน ${MAX_CUSTOM_SKILL_LENGTH} ตัวอักษร`;
  if (existing.length >= MAX_CUSTOM_SKILLS) return `เพิ่มได้สูงสุด ${MAX_CUSTOM_SKILLS} รายการ`;
  if (existing.some((t) => t.toLowerCase() === v.toLowerCase())) return 'มีทักษะนี้อยู่แล้ว';
  if (CARE_SKILLS.some((s) => s.label === v)) {
    return `"${v}" อยู่ในรายการทักษะด้านบนแล้ว ติ๊กจากรายการแทน เพื่อให้ใช้จับคู่งานได้`;
  }
  return null;
}

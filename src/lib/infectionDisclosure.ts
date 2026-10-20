/**
 * แจ้งโรคติดเชื้อ (S10 · PYG-620) — ตัวช่วยที่ใช้ร่วมกันทั้งสองฝั่ง (BE PYG-619 · contract PYG-617)
 *
 * ★ ข้อมูลสุขภาพ: ห้ามเก็บลง localStorage / sessionStorage / URL / analytics / error tracking
 */
import {
  updateCareRecipientInfection,
  type CareRecipientSummary,
} from './careRecipientsApi';

/** true = มี · false = ไม่มี · null = ยังไม่ได้ระบุ — ห้ามเช็คแบบ truthy (null ≠ false) */
export type InfectionValue = boolean | null;

export type InfectionKey = 'yes' | 'no' | 'unset';

export function infectionKey(value: InfectionValue | undefined): InfectionKey {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'unset';
}

// ── ฝั่งญาติ ─────────────────────────────────────────────────────────────────

export function readRecipientInfection(
  recipient: Pick<CareRecipientSummary, 'hasInfectiousDisease'>,
): InfectionValue {
  return recipient.hasInfectiousDisease ?? null;
}

export function saveRecipientInfection(id: string, value: boolean): Promise<InfectionValue> {
  return updateCareRecipientInfection(id, value);
}

// ── ฝั่งผู้ดูแล ───────────────────────────────────────────────────────────────

export interface InfectionDisclosure {
  hasInfectiousDisease: InfectionValue;
  /** ISO · null = ผู้ดูแลคนนี้ยังไม่ได้รับทราบค่าล่าสุด */
  acknowledgedAt: string | null;
}

/** "20 ต.ค. 2569 · 14:32" */
export function formatAckTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

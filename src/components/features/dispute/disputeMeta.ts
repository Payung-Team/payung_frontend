// PYG-317 — Dispute helpers/constants (แชร์ระหว่าง badge / table / kpi)

export type DisputeStatus = 'none' | 'flagged' | 'resolved';
export type DisputeFiledBy = 'customer' | 'caregiver';
export type DisputeSortBy = 'sla_asc' | 'sla_desc';

// ─── Status meta (schema จริงมีแค่ flagged | resolved ในคิว) ────────────────
export interface DisputeStatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const STATUS_META: Record<'flagged' | 'resolved', DisputeStatusMeta> = {
  flagged:  { label: 'รอตรวจสอบ',   badgeClass: 'bg-[#FEF2F2] text-[#DC2626]', dotClass: 'bg-[#DC2626]' },
  resolved: { label: 'ปิดเรื่องแล้ว', badgeClass: 'bg-[#ECFDF5] text-[#047857]', dotClass: 'bg-[#10B981]' },
};

// ─── Filed-by meta (ผู้แจ้ง) ─────────────────────────────────────────────────
export interface DisputeFiledByMeta {
  label: string;
  badgeClass: string;
}

export const FILED_BY_META: Record<DisputeFiledBy, DisputeFiledByMeta> = {
  customer:  { label: 'ลูกค้า', badgeClass: 'bg-[#EEF2FF] text-[#4338CA]' },
  caregiver: { label: 'ผู้ดูแล', badgeClass: 'bg-[#FFF3E0] text-[#C2410C]' },
};

// ─── SLA (คำนวณจาก slaDueAt เทียบเวลาปัจจุบัน) — พอร์ตจาก mockup slaInfo ──────
export interface SlaMeta {
  text: string;
  badgeClass: string;
  dotClass: string;
  icon: string;
  urgent: boolean;
  overdue: boolean;
}

export function computeSla(slaDueAt?: string | null, status?: string): SlaMeta {
  if (status === 'resolved' || !slaDueAt) {
    return { text: 'ปิดเรื่องแล้ว', badgeClass: 'bg-[#F0F1F3] text-[#8A8C8E]', dotClass: 'bg-[#C6C8CB]', icon: 'check_circle', urgent: false, overdue: false };
  }

  const ms = new Date(slaDueAt).getTime() - Date.now();
  const overdue = ms < 0;
  const absMs = Math.abs(ms);
  const hours = Math.floor(absMs / 3_600_000);
  const mins = Math.floor((absMs % 3_600_000) / 60_000);
  const t = (hours > 0 ? `${hours} ชม. ` : '') + `${mins} นาที`;

  if (overdue) {
    return { text: `เกิน SLA ${t}`, badgeClass: 'bg-[#FEF2F2] text-[#DC2626]', dotClass: 'bg-[#DC2626]', icon: 'error', urgent: true, overdue: true };
  }
  if (hours < 4) {
    return { text: `เหลือ ${t}`, badgeClass: 'bg-[#FFFBEB] text-[#D97706]', dotClass: 'bg-[#F59E0B]', icon: 'schedule', urgent: true, overdue: false };
  }
  return { text: `เหลือ ${t}`, badgeClass: 'bg-[#ECFDF5] text-[#047857]', dotClass: 'bg-[#10B981]', icon: 'schedule', urgent: false, overdue: false };
}

// ─── Formatters ──────────────────────────────────────────────────────────────
export function formatTHB(amount?: number | null): string {
  if (amount == null) return '-';
  return `฿${amount.toLocaleString('en-US')}`;
}

export function formatThaiDate(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

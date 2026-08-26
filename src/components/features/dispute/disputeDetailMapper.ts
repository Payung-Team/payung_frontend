// PYG-320 — แปลง REST response (DisputeDetailResponse) → shape ที่ component ในหน้านี้ใช้อยู่
// เก็บ type เดิมไว้ทั้งหมด เพื่อให้ component แทบไม่ต้องแก้

import { formatTHB, type DisputeFiledBy } from './disputeMeta';
import type {
  AuditEntry,
  DisputeDetailResponse,
  EvidenceEntry,
  PaymentHistoryEntry,
} from '../../../lib/adminDisputeApi';

// SLA window เท่ากับฝั่ง backend (DISPUTE_SLA_HOURS) — sla_due = filed_at + 72 ชม.
const DISPUTE_SLA_HOURS = 72;

export type EvidenceKind = 'image' | 'pdf';

export interface EvidenceFile {
  id: string;
  name: string;
  kind: EvidenceKind;
  uploadedBy: DisputeFiledBy;
  url: string; // signed URL 1 ชม. จาก backend
}

export interface PaymentEvent {
  id: string;
  status: string; // PaymentStatus (toStatus) — ให้ component map เป็น label ไทยเอง
  date: string;
  amount: number;
}

export interface TimelineEvent {
  id: string;
  actor: string;
  actorKind: 'customer' | 'caregiver' | 'system' | 'admin';
  at: string;
  title: string; // หัวข้อ/ผลตัดสิน (เน้น)
  detail?: string; // เหตุผล/โน้ต (รอง)
}

export interface InternalNote {
  id: string;
  author: string;
  at: string;
  message: string;
}

export interface DisputePartyInfo {
  name: string;
  role: DisputeFiledBy;
}

export interface DisputeDetail {
  id: string;
  displayId: string;
  status: string;
  filedBy: DisputeFiledBy;
  filer: DisputePartyInfo;
  respondent: DisputePartyInfo;
  bookingId: string;
  serviceDate: string;
  amount: number;
  reason: string;
  filedAt?: string;
  slaDueAt?: string;
  evidence: EvidenceFile[];
  payments: PaymentEvent[];
  timeline: TimelineEvent[];
  notes: InternalNote[];
}

// ── helpers ────────────────────────────────────────────────────────────────────

// backend actorRole: 'patient' | 'caregiver' | 'admin' | (null=system)
function toFiledBy(actorRole?: string): DisputeFiledBy {
  return actorRole === 'caregiver' ? 'caregiver' : 'customer';
}

function toActorKind(actorRole?: string): TimelineEvent['actorKind'] {
  if (actorRole === 'patient' || actorRole === 'customer') return 'customer';
  if (actorRole === 'caregiver') return 'caregiver';
  if (actorRole === 'admin') return 'admin';
  return 'system';
}

function partyName(p?: { displayName?: string; email?: string }): string {
  return p?.displayName || p?.email || '-';
}

// ข้อความ timeline: ใช้ note ถ้ามี ไม่งั้น map จาก action
const ACTION_LABEL: Record<string, string> = {
  dispute_filed: 'แจ้งปัญหาเข้ามา',
  note_added: 'เพิ่มบันทึกภายใน',
  resolved: 'ปิดเรื่องแล้ว',
};

// ป้ายผลตัดสิน จาก metadata.decision + refundAmount ที่ backend เขียนไว้ตอน resolve
function resolveSummary(a: AuditEntry): string {
  const decision = a.metadata?.decision as string | undefined;
  const refundAmount = a.metadata?.refundAmount as number | null | undefined;

  if (decision === 'refund_full') {
    return `ปิดเรื่อง · คืนเงินเต็มจำนวน${refundAmount != null ? ` ${formatTHB(refundAmount)}` : ''}`;
  }
  if (decision === 'refund_partial') {
    return `ปิดเรื่อง · คืนเงินบางส่วน${refundAmount != null ? ` ${formatTHB(refundAmount)}` : ''}`;
  }
  if (decision === 'no_refund') {
    return 'ปิดเรื่อง · ไม่คืนเงิน';
  }
  return ACTION_LABEL.resolved;
}

// แยกหัวข้อ (title) กับเหตุผล (detail) เพื่อให้ timeline มีลำดับสายตา ไม่กลืนกัน
function auditTitleDetail(a: AuditEntry): { title: string; detail?: string } {
  if (a.action === 'resolved') {
    return { title: resolveSummary(a), detail: a.note ?? undefined };
  }
  const label = ACTION_LABEL[a.action];
  if (label) {
    return { title: label, detail: a.note ?? undefined };
  }
  // action ที่ไม่รู้จัก — ใช้ note เป็นหัวข้อไปเลย ไม่ต้องมี detail ซ้ำ
  return { title: a.note ?? a.action };
}

function evidenceKind(mimeType: string): EvidenceKind {
  return mimeType.startsWith('image/') ? 'image' : 'pdf';
}

function mapEvidence(e: EvidenceEntry): EvidenceFile {
  return {
    id: e.id,
    name: e.fileName,
    kind: evidenceKind(e.mimeType),
    uploadedBy: toFiledBy(e.uploaderRole),
    url: e.fileUrl,
  };
}

function mapTimeline(a: AuditEntry): TimelineEvent {
  const kind = toActorKind(a.actorRole);
  const actor =
    a.actor?.displayName ||
    (kind === 'system' ? 'ระบบ' : kind === 'customer' ? 'ลูกค้า' : kind === 'caregiver' ? 'ผู้ดูแล' : 'แอดมิน');
  return { id: a.id, actor, actorKind: kind, at: a.createdAt, ...auditTitleDetail(a) };
}

function mapPayment(p: PaymentHistoryEntry, amount: number): PaymentEvent {
  return { id: p.id, status: p.toStatus, date: p.createdAt, amount };
}

export function mapDetailResponse(raw: DisputeDetailResponse): DisputeDetail {
  const filedEntry = raw.audit.find((a) => a.action === 'dispute_filed');
  const filedAt = filedEntry?.createdAt;
  const slaDueAt = filedAt
    ? new Date(new Date(filedAt).getTime() + DISPUTE_SLA_HOURS * 60 * 60 * 1000).toISOString()
    : undefined;
  const filedBy = toFiledBy(filedEntry?.actorRole);
  const amount = raw.payment?.amount ?? 0;

  return {
    id: raw.id,
    displayId: raw.id,
    status: raw.disputeStatus,
    filedBy,
    filer: {
      name: partyName(filedBy === 'caregiver' ? raw.caregiver : raw.patient),
      role: filedBy,
    },
    respondent: {
      name: partyName(filedBy === 'caregiver' ? raw.patient : raw.caregiver),
      role: filedBy === 'caregiver' ? 'customer' : 'caregiver',
    },
    bookingId: raw.id,
    serviceDate: raw.bookingDate,
    amount,
    reason: raw.disputeReason ?? '',
    filedAt,
    slaDueAt,
    // audit เรียง desc จาก backend → timeline อยากได้เก่า→ใหม่ จึง reverse
    evidence: raw.evidence.map(mapEvidence),
    payments: raw.paymentHistory.map((p) => mapPayment(p, amount)),
    timeline: [...raw.audit].reverse().map(mapTimeline),
    notes: [...raw.notes].reverse().map((n) => ({
      id: n.id,
      author: n.actor?.displayName || 'แอดมิน',
      at: n.createdAt,
      message: n.note ?? '',
    })),
  };
}

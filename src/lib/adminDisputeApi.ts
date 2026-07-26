// PYG-320 — REST client สำหรับ admin dispute detail (endpoint เป็น REST ไม่ใช่ GraphQL)
// รวม fetch + token + endpoint path ไว้ที่เดียว — component/page เรียกผ่านฟังก์ชันเหล่านี้เท่านั้น

import { supabase } from './supabase';

// REST base = ตัด /graphql ออกจาก VITE_GRAPHQL_URL (pattern เดียวกับ BookingContext)
const API_BASE = ((import.meta.env.VITE_GRAPHQL_URL as string) || 'http://localhost:3000/graphql').replace(
  '/graphql',
  '',
);

async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    // NestJS error body: { message: string | string[], statusCode, error }
    let message = `เกิดข้อผิดพลาด (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body?.message) {
        message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      }
    } catch {
      // ไม่มี body JSON — ใช้ข้อความ default
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── response shapes — ตรงกับ dispute-detail.entity.ts ของ backend ──────────────

export interface PartyBrief {
  id: string;
  displayName?: string;
  email?: string;
}

export interface PaymentBriefResponse {
  id: string;
  amount: number;
  currency: string;
  paymentStatus: string;
}

export interface PaymentHistoryEntry {
  id: string;
  fromStatus?: string;
  toStatus: string;
  changedBy?: PartyBrief;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface EvidenceEntry {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  note?: string;
  uploadedBy?: PartyBrief;
  uploaderRole: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  actor?: PartyBrief;
  actorRole?: string;
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DisputeDetailResponse {
  id: string;
  bookingDate: string;
  status: string;
  serviceType: string;
  timeSlot: string;
  locationAddress: string;
  estimatedCost?: number;

  disputeStatus: string;
  disputeReason?: string;
  disputeResolvedAt?: string;
  resolvedBy?: PartyBrief;

  patient: PartyBrief;
  caregiver?: PartyBrief;
  payment?: PaymentBriefResponse;

  paymentHistory: PaymentHistoryEntry[];
  evidence: EvidenceEntry[];
  notes: AuditEntry[];
  audit: AuditEntry[];

  createdAt: string;
  updatedAt: string;
}

// REST vocabulary ของ resolve (ต่างจาก GraphQL enum — ดู resolve-dispute.dto.ts)
export type ResolutionAction = 'full_refund' | 'partial_refund' | 'reject';

export interface ResolvePayload {
  resolution: ResolutionAction;
  amount?: number; // ต้องมีเมื่อ resolution = partial_refund
  reason: string;
}

// ── 3 endpoints ───────────────────────────────────────────────────────────────

export function fetchDisputeDetail(id: string): Promise<DisputeDetailResponse> {
  return authedFetch<DisputeDetailResponse>(`/api/v1/admin/disputes/${id}`);
}

export function addDisputeNote(id: string, body: string): Promise<AuditEntry> {
  return authedFetch<AuditEntry>(`/api/v1/admin/disputes/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export function resolveDispute(id: string, payload: ResolvePayload): Promise<unknown> {
  return authedFetch(`/api/v1/admin/disputes/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

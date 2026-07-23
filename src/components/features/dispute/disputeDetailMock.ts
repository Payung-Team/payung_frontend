// PYG-319 / PYG-321 — mock data สำหรับหน้า Dispute Detail (ยังไม่ต่อ backend)

import type { DisputeFiledBy } from './disputeMeta';

export type EvidenceKind = 'image' | 'pdf';

export interface EvidenceFile {
  id: string;
  name: string;
  kind: EvidenceKind;
  uploadedBy: DisputeFiledBy;
}

export interface PaymentEvent {
  id: string;
  label: string;
  date: string;
  amount: number;
}

export interface TimelineEvent {
  id: string;
  actor: string;
  actorKind: 'customer' | 'caregiver' | 'system' | 'admin';
  at: string;
  message: string;
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
  filedAt: string;
  slaDueAt: string;
  evidence: EvidenceFile[];
  payments: PaymentEvent[];
  timeline: TimelineEvent[];
  notes: InternalNote[];
}

const MOCK_DISPUTE: DisputeDetail = {
  id: 'DSP-2026-0005',
  displayId: 'DSP-2026-0005',
  status: 'flagged',
  filedBy: 'customer',
  filer: { name: 'ประยุทธ์ ดีใจ', role: 'customer' },
  respondent: { name: 'มานะ รักงาน', role: 'caregiver' },
  bookingId: 'BK-2026-0896',
  serviceDate: '2026-06-11T09:00:00+07:00',
  amount: 3200,
  reason: 'ทักษะไม่ตรงกับที่ระบุในโปรไฟล์ ทำแผลไม่เป็น',
  filedAt: '2026-06-12T09:12:00+07:00',
  slaDueAt: '2026-06-14T09:12:00+07:00',
  evidence: [
    { id: 'ev-1', name: 'ภาพหน้าจอแชท', kind: 'image', uploadedBy: 'customer' },
    { id: 'ev-2', name: 'รูปสถานที่', kind: 'image', uploadedBy: 'customer' },
    { id: 'ev-3', name: 'บันทึกเวลา.pdf', kind: 'pdf', uploadedBy: 'customer' },
    { id: 'ev-4', name: 'ภาพงานที่ทำจริง', kind: 'image', uploadedBy: 'caregiver' },
    { id: 'ev-5', name: 'ใบเซ็นรับงาน.pdf', kind: 'pdf', uploadedBy: 'caregiver' },
  ],
  payments: [
    { id: 'pay-1', label: 'ชำระเงิน (Authorize + Capture)', date: '2026-06-10T14:05:00+07:00', amount: 3200 },
    { id: 'pay-2', label: 'กันวงเงินคืนไว้ระหว่างตรวจสอบ (Hold)', date: '2026-06-12T09:12:00+07:00', amount: 3200 },
  ],
  timeline: [
    { id: 'tl-1', actor: 'ลูกค้า', actorKind: 'customer', at: '2026-06-12T09:12:00+07:00', message: 'แจ้งปัญหาเข้ามา' },
    { id: 'tl-2', actor: 'ระบบ', actorKind: 'system', at: '2026-06-12T09:12:00+07:00', message: 'กันวงเงิน ฿3,200 ไว้ (Hold) ระหว่างตรวจสอบ' },
    { id: 'tl-3', actor: 'Admin A', actorKind: 'admin', at: '2026-06-12T18:20:00+07:00', message: 'เริ่มตรวจสอบ · ขอไฟล์แนบเพิ่ม' },
  ],
  notes: [
    {
      id: 'note-1',
      author: 'Admin A',
      at: '2026-06-12T18:20:00+07:00',
      message: 'ติดต่อทั้งสองฝ่ายแล้ว รอไฟล์แนบเพิ่มภายใน 24 ชม.',
    },
  ],
};

/**
 * mock lookup — คืน dispute เดียวกันทุก id ที่ส่งเข้ามา (ยกเว้น id ว่าง)
 * เพื่อให้กดปุ่ม "ตรวจสอบ" จากหน้า list ด้วย id จริงแล้วยังเปิดหน้าได้
 * TODO: แทนที่ด้วย useQuery(ADMIN_DISPUTE_DETAIL) เมื่อ backend พร้อม
 */
export function findMockDispute(id?: string): DisputeDetail | null {
  if (!id || id === 'not-found') {
    return null;
  }
  return { ...MOCK_DISPUTE, id };
}

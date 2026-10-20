// โปรไฟล์ผู้รับบริการของผู้ใช้ — REST /api/v1/patient/care-recipients
//
// ใช้โดยแบบประเมิน (S08 · PYG-610): หาโปรไฟล์ของตัวเองหลัง Onboarding, ชื่อ/อายุของคนที่กำลังประเมิน,
// สถานะ hasAssessment ในโปรไฟล์ และสร้างโปรไฟล์ก่อนประเมินตอนจองให้ผู้รับบริการรายใหม่
//
// ★ endpoint นี้คืนเฉพาะโปรไฟล์ที่ผู้ใช้เป็นเจ้าของ — ตรงกับสิทธิ์ของ submitCareRecipientAssessment
//   (บันทึกได้เฉพาะเจ้าของ) จึงใช้ "อยู่ในลิสต์นี้" เป็นเงื่อนไขว่าประเมินให้ได้

import { supabase } from './supabase';
import type { PatientProfile } from './patientProfile';

const API_BASE = ((import.meta.env.VITE_GRAPHQL_URL as string) || 'http://localhost:3000/graphql')
  .replace('/graphql', '');

export interface CareRecipientSummary {
  id: string;
  name: string;
  nickname?: string | null;
  isSelf?: boolean;
  /** S08: มีแบบประเมินแล้วหรือยัง — ไม่มีแบบประเมิน BE ไม่ให้สร้าง booking (R11) */
  hasAssessment?: boolean;
  details?: PatientProfile | null;
  /**
   * S10 · PYG-620 — โรคติดเชื้อที่ญาติระบุ (ข้อมูลสุขภาพ) · null = ยังไม่ได้ระบุ (ไม่ใช่ "ไม่มี")
   * undefined = BE ยังไม่มี field นี้ (PYG-619) — อ่านผ่าน readRecipientInfection เท่านั้น
   * ★ ห้ามคัดลอกค่านี้ลง bookingDraft — draft ถูกเก็บใน sessionStorage
   */
  hasInfectiousDisease?: boolean | null;
}

/** 422 จาก BE เมื่อบันทึกโรคติดเชื้อโดยไม่ได้รับทราบข้อความแจ้งการเปิดเผย (S10-AC5) */
export class InfectionNoticeNotAcceptedError extends Error {}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('no session');
  return { Authorization: `Bearer ${token}` };
}

/** throw เมื่อดึงไม่ได้ — ผู้เรียกตัดสินเองว่าจะแสดง error หรือปล่อยผ่าน */
export async function fetchCareRecipients(): Promise<CareRecipientSummary[]> {
  const res = await fetch(`${API_BASE}/api/v1/patient/care-recipients`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as CareRecipientSummary[];
}

export async function createCareRecipient(input: {
  name: string;
  nickname?: string;
  details?: PatientProfile;
}): Promise<CareRecipientSummary> {
  const res = await fetch(`${API_BASE}/api/v1/patient/care-recipients`, {
    method: 'POST',
    headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as CareRecipientSummary;
}

/**
 * S10 · PYG-620 — บันทึกโรคติดเชื้อของโปรไฟล์ (เจ้าของเท่านั้น) · PUT เดิมของโปรไฟล์ ส่งเฉพาะสองช่องนี้
 * ★ ข้อความ error ห้ามมีค่าที่บันทึก (ข้อมูลสุขภาพ) — มีแค่สถานะ HTTP
 */
export async function updateCareRecipientInfection(
  id: string,
  hasInfectiousDisease: boolean,
): Promise<boolean | null> {
  const res = await fetch(`${API_BASE}/api/v1/patient/care-recipients/${id}`, {
    method: 'PUT',
    headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ hasInfectiousDisease, disclosureNoticeAccepted: true }),
  });
  if (res.status === 422) {
    const body = await res.json().catch(() => null);
    if (body?.code === 'INFECTION_NOTICE_NOT_ACCEPTED') throw new InfectionNoticeNotAcceptedError();
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const saved = (await res.json()) as CareRecipientSummary;
  return saved.hasInfectiousDisease ?? null;
}

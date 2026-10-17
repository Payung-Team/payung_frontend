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
}

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

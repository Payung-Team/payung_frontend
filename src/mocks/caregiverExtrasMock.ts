import { useSyncExternalStore } from 'react';
import { PROFESSION_CODES, isProfession, type Profession } from '../lib/professions';
import type { ProfessionChangeRequest } from '../graphql/professionChange';

/**
 * MOCK (PYG-556) — แทน BE ระหว่างที่ยังไม่มี field profession / customSkills และ API ขอเปลี่ยนวิชาชีพ
 *
 * ข้อมูลอยู่ใน localStorage ของเบราว์เซอร์นี้เท่านั้น ไม่ไปถึง BE และเครื่องอื่นไม่เห็น
 * ค่าจริงจาก BE (ถ้ามี) ถูกใช้ก่อนเสมอ — resolveProfession / resolveCustomSkills ใช้ mock เมื่อ BE ไม่ส่งค่ามาเท่านั้น
 * ★ เมื่อ BE พร้อม: เปิด field ใน graphql/queries.ts (PROFESSION_FIELD / CUSTOM_SKILLS_FIELD), ส่ง field ใน
 *   KycStep4 / CaregiverEditProfile (ดู TODO(PYG-575)), เชื่อม useProfessionChange กับ graphql/professionChange.ts
 *   แล้วลบโฟลเดอร์ src/mocks/ และจุดที่เรียกใช้
 */

interface CaregiverExtras {
  profession?: Profession;
  customSkills?: string[];
}

interface MockState {
  extras: Record<string, CaregiverExtras>;
  /** คำขอล่าสุดต่อผู้ดูแล (key = caregiverId) */
  requests: Record<string, ProfessionChangeRequest>;
}

const STORAGE_KEY = 'payung.mock.pyg556';
const listeners = new Set<() => void>();

function load(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MockState>;
      return { extras: parsed.extras ?? {}, requests: parsed.requests ?? {} };
    }
  } catch {
    // private window / storage ถูกบล็อก / JSON เสีย — เริ่มใหม่
  }
  return { extras: {}, requests: {} };
}

let state: MockState = load();

function commit(next: MockState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // เก็บไม่ได้ก็ยังใช้ในหน้านี้ต่อได้ แค่ reload แล้วหาย
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** แท็บอื่นแก้ข้อมูล mock → แท็บนี้เห็นด้วย (เช่นเปิดหน้าแอดมินคู่กับหน้าผู้ดูแล) */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      listeners.forEach((fn) => fn());
    }
  });
}

/** ใช้ใน component ที่ต้อง re-render เมื่อข้อมูล mock เปลี่ยน */
export function useMockState(): MockState {
  return useSyncExternalStore(subscribe, () => state);
}

/** อ่านค่าครั้งเดียว (ใน effect / handler) โดยไม่ subscribe */
export function getMockState(): MockState {
  return state;
}

export function setMockExtras(caregiverId: string, patch: CaregiverExtras) {
  if (!caregiverId) return;
  commit({ ...state, extras: { ...state.extras, [caregiverId]: { ...state.extras[caregiverId], ...patch } } });
}

/**
 * วิชาชีพจำลองของผู้ดูแลที่ยังไม่เคยบันทึกในเบราว์เซอร์นี้ — กระจายจาก id ให้เห็นป้ายครบทั้ง 3 แบบในหน้า List
 * (ข้อมูลจริงหลัง migration เป็น general_caregiver ทุกคน)
 */
function hashedProfession(caregiverId: string): Profession {
  let h = 0;
  for (let i = 0; i < caregiverId.length; i++) h = (h * 31 + caregiverId.charCodeAt(i)) >>> 0;
  return PROFESSION_CODES[h % PROFESSION_CODES.length];
}

/**
 * วิชาชีพที่จะแสดง: ค่าจริงจาก BE → ค่าที่บันทึกใน mock → ค่าจาก id
 * `fallback: 'none'` = ไม่เดาให้ (ใช้ตอนเติมฟอร์ม KYC — ต้องเห็นเป็นช่องว่าง S01-E1)
 */
export function resolveProfession(
  mock: MockState,
  caregiverId: string | null | undefined,
  apiValue: string | null | undefined,
  fallback: 'hash' | 'none' = 'hash',
): string | null {
  if (isProfession(apiValue)) return apiValue;
  if (!caregiverId) return null;
  const saved = mock.extras[caregiverId]?.profession;
  if (isProfession(saved)) return saved;
  return fallback === 'hash' ? hashedProfession(caregiverId) : null;
}

export function resolveCustomSkills(
  mock: MockState,
  caregiverId: string | null | undefined,
  apiValue: string[] | null | undefined,
): string[] {
  if (apiValue) return apiValue;
  if (!caregiverId) return [];
  return mock.extras[caregiverId]?.customSkills ?? [];
}

// ── คำขอเปลี่ยนวิชาชีพ ──────────────────────────────────────────────────────

export function getMockRequest(caregiverId: string): ProfessionChangeRequest | null {
  return state.requests[caregiverId] ?? null;
}

export function saveMockRequest(caregiverId: string, request: ProfessionChangeRequest) {
  commit({ ...state, requests: { ...state.requests, [caregiverId]: request } });
}

/** จำลองแอดมินตรวจ — อนุมัติแล้ววิชาชีพเปลี่ยนทันที (ทั้งหน้าผู้ดูแลและฝั่ง Elder ในเบราว์เซอร์นี้) */
export function reviewMockRequest(caregiverId: string, action: 'approved' | 'rejected', reason?: string) {
  const req = state.requests[caregiverId];
  if (!req || req.status !== 'pending') return;
  const reviewed: ProfessionChangeRequest = {
    ...req,
    status: action,
    rejectionReason: action === 'rejected' ? (reason ?? 'ภาพใบประกอบฯ ไม่ชัด อ่านวันหมดอายุไม่ได้') : null,
    reviewedAt: new Date().toISOString(),
  };
  const extras =
    action === 'approved' && isProfession(req.toProfession)
      ? { ...state.extras, [caregiverId]: { ...state.extras[caregiverId], profession: req.toProfession } }
      : state.extras;
  commit({ extras, requests: { ...state.requests, [caregiverId]: reviewed } });
}

/** หน่วงเวลาให้เห็นสถานะกำลังโหลดเหมือนเรียก API จริง */
export function mockDelay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

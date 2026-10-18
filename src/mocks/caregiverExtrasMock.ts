import { useSyncExternalStore } from 'react';

/**
 * MOCK (PYG-556) — เหลือเฉพาะ customSkills (ทักษะอื่นๆ ที่ผู้ดูแลพิมพ์เอง)
 *
 * วิชาชีพและคำขอเปลี่ยนวิชาชีพใช้ BE จริงแล้ว (PYG-575) · customSkills ยังไม่อยู่ใน story PYG-556 และ DB ไม่มีคอลัมน์
 * (contract PYG-573 §9 ข้อ 2) — ข้อมูลอยู่ใน localStorage ของเบราว์เซอร์นี้เท่านั้น ไม่ไปถึง BE และเครื่องอื่นไม่เห็น
 * ★ เมื่อ BE พร้อม: เปิด CUSTOM_SKILLS_FIELD ใน graphql/queries.ts, ส่ง customSkills ใน KycStep4 / CaregiverEditProfile
 *   แล้วลบโฟลเดอร์ src/mocks/ และจุดที่เรียกใช้
 */

interface CaregiverExtras {
  customSkills?: string[];
}

interface MockState {
  extras: Record<string, CaregiverExtras>;
}

const STORAGE_KEY = 'payung.mock.pyg556';
const listeners = new Set<() => void>();

function load(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MockState>;
      return { extras: parsed.extras ?? {} };
    }
  } catch {
    // private window / storage ถูกบล็อก / JSON เสีย — เริ่มใหม่
  }
  return { extras: {} };
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

/** แท็บอื่นแก้ข้อมูล mock → แท็บนี้เห็นด้วย */
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

export function resolveCustomSkills(
  mock: MockState,
  caregiverId: string | null | undefined,
  apiValue: string[] | null | undefined,
): string[] {
  if (apiValue) return apiValue;
  if (!caregiverId) return [];
  return mock.extras[caregiverId]?.customSkills ?? [];
}
